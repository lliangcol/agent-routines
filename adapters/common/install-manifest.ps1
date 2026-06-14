param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('codex','claude-code')]
    [string]$Tool,
    [string]$ManifestPath = '',
    [switch]$Force,
    [ValidateSet('dry-run','merge','replace-listed','sync-prune')]
    [string]$Mode = 'merge',
    [switch]$WhatIf,
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: install-manifest.ps1 -Tool codex|claude-code -ManifestPath <path> [-Force] [-Mode merge|replace-listed|sync-prune|dry-run] [-WhatIf]'
    exit 0
}

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
$OutputEncoding = [Console]::OutputEncoding
if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    throw 'ManifestPath is required. Use -ManifestPath <path>.'
}

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$Manifest = (Resolve-Path -LiteralPath $ManifestPath).Path
$SkillSourceRoot = Join-Path $RepoRoot 'skills'
$WorkflowSourceRoot = Join-Path $RepoRoot 'workflows'
$ToolKey = if ($Tool -eq 'codex') { 'codex' } else { 'claudeCode' }
$SkillFolder = if ($Tool -eq 'codex') { '.codex\skills' } else { '.claude\skills' }
$UserSkillTargetRoot = if ($Tool -eq 'codex') { Join-Path $HOME '.codex\skills' } else { Join-Path $HOME '.claude\skills' }
$UserWorkflowTargetRoot = Join-Path $HOME '.agent-routines\workflows'
$installed = @()
$skipped = @()
$planned = @()
$entries = @()
$errors = @()

function Resolve-ManifestProjectPath {
    param([string]$ProjectPath)
    if ([System.IO.Path]::IsPathRooted($ProjectPath)) {
        return (Resolve-Path -LiteralPath $ProjectPath).Path
    }
    return (Resolve-Path -LiteralPath (Join-Path $RepoRoot $ProjectPath)).Path
}

function Get-ManifestNames {
    param([object]$Block, [string]$PropertyName, [string]$Context)
    if ($null -eq $Block) { return @() }
    $prop = $Block.PSObject.Properties[$PropertyName]
    if ($null -eq $prop -or $null -eq $prop.Value) { return @() }
    if ($prop.Value -isnot [System.Collections.IEnumerable] -or $prop.Value -is [string]) {
        throw "$Context.$PropertyName must be an array."
    }
    $result = @()
    foreach ($item in $prop.Value) {
        if ($item -isnot [string] -or [string]::IsNullOrWhiteSpace($item)) {
            throw "$Context.$PropertyName contains an invalid name."
        }
        if ($item -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
            throw "$Context.$PropertyName contains invalid kebab-case name: $item"
        }
        $result += $item
    }
    return $result
}

function Add-ManifestEntries {
    param(
        [object]$Block,
        [string]$Context,
        [string]$SkillTargetRoot,
        [string]$WorkflowTargetRoot
    )
    foreach ($skill in (Get-ManifestNames -Block $Block -PropertyName 'skills' -Context $Context)) {
        $source = Join-Path $SkillSourceRoot $skill
        $target = Join-Path $SkillTargetRoot $skill
        $script:entries += [pscustomobject]@{ Source = $source; Target = $target; Kind = 'skill'; Name = $skill }
    }
    foreach ($workflow in (Get-ManifestNames -Block $Block -PropertyName 'workflows' -Context $Context)) {
        $source = Join-Path $WorkflowSourceRoot $workflow
        $target = Join-Path $WorkflowTargetRoot $workflow
        $script:entries += [pscustomobject]@{ Source = $source; Target = $target; Kind = 'workflow'; Name = $workflow }
    }
}

function Copy-DirectorySafe {
    param([string]$Source, [string]$Target)
    $action = 'install'
    if (Test-Path -LiteralPath $Target) {
        if (-not $Force) {
            $script:skipped += "exists:$Target"
            return
        }
        $action = 'replace'
    }
    if ($WhatIf) {
        $script:planned += "${action}:$Target"
        return
    }
    if (Test-Path -LiteralPath $Target) {
        Remove-Item -LiteralPath $Target -Recurse -Force
    }
    $parent = Split-Path -Parent $Target
    if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Copy-Item -LiteralPath $Source -Destination $Target -Recurse
    $script:installed += $Target
}

function Get-NormalizedPath {
    param([string]$PathValue)
    return ([System.IO.Path]::GetFullPath($PathValue)).TrimEnd([char[]]@('\','/'))
}

function Test-SamePath {
    param([string]$Actual, [string]$Expected)
    return [string]::Equals((Get-NormalizedPath -PathValue $Actual), (Get-NormalizedPath -PathValue $Expected), [System.StringComparison]::OrdinalIgnoreCase)
}

function Resolve-ManifestProjectPathLoose {
    param([string]$ProjectPath)
    if ([System.IO.Path]::IsPathRooted($ProjectPath)) {
        return [System.IO.Path]::GetFullPath($ProjectPath)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $ProjectPath))
}

function Get-ExpectedV2Source {
    param([string]$Kind, [string]$Name)
    if ($Kind -eq 'skill') { return (Join-Path $SkillSourceRoot $Name) }
    if ($Kind -eq 'workflow') { return (Join-Path $WorkflowSourceRoot $Name) }
    throw "Unsupported action kind: $Kind"
}

function Get-ExpectedV2Target {
    param([object]$Action)
    $kind = [string]$Action.kind
    $name = [string]$Action.name
    $scope = [string]$Action.scope
    $actionTool = [string]$Action.tool
    if ($kind -eq 'workflow') {
        if ($actionTool -ne 'shared') { throw 'Workflow actions must use tool shared.' }
        if ($scope -eq 'user') { return (Join-Path $UserWorkflowTargetRoot $name) }
        if ($scope -eq 'project') {
            if ([string]::IsNullOrWhiteSpace([string]$Action.projectPath)) { throw 'Project-scoped actions must include projectPath.' }
            $projectRoot = Resolve-ManifestProjectPathLoose -ProjectPath ([string]$Action.projectPath)
            return (Join-Path (Join-Path $projectRoot '.agent-routines\workflows') $name)
        }
    } elseif ($kind -eq 'skill') {
        if ($actionTool -ne $ToolKey) { throw "Skill action tool must match adapter tool $ToolKey." }
        if ($scope -eq 'user') { return (Join-Path $UserSkillTargetRoot $name) }
        if ($scope -eq 'project') {
            if ([string]::IsNullOrWhiteSpace([string]$Action.projectPath)) { throw 'Project-scoped actions must include projectPath.' }
            $projectRoot = Resolve-ManifestProjectPathLoose -ProjectPath ([string]$Action.projectPath)
            return (Join-Path (Join-Path $projectRoot $SkillFolder) $name)
        }
    }
    throw "Unsupported action scope or kind: $scope/$kind"
}

function Resolve-V2ActionPaths {
    param([object]$Action)
    $kind = [string]$Action.kind
    $name = [string]$Action.name
    $source = [string]$Action.sourcePath
    $target = [string]$Action.targetPath
    $expectedSource = Get-ExpectedV2Source -Kind $kind -Name $name
    $expectedTarget = Get-ExpectedV2Target -Action $Action
    if (-not (Test-SamePath -Actual $source -Expected $expectedSource)) {
        throw "action.sourcePath does not match expected source for $kind ${name}: $source"
    }
    if (-not (Test-SamePath -Actual $target -Expected $expectedTarget)) {
        throw "action.targetPath does not match expected target for $kind ${name}: $target"
    }
    if ([string]$Action.operation -ne 'prune-candidate' -and -not (Test-Path -LiteralPath $expectedSource)) {
        throw "Missing source path: $expectedSource"
    }
    return [pscustomobject]@{ Source = $expectedSource; Target = $expectedTarget }
}

$json = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
if ($json.version -eq 2) {
    $backupRoot = Join-Path $RepoRoot (Join-Path '.agent-routines\generated\backups' (Get-Date -Format 'yyyyMMdd-HHmmss'))
    $toolKey = if ($Tool -eq 'codex') { 'codex' } else { 'claudeCode' }
    if ($Force -and $Mode -eq 'merge') { $Mode = 'replace-listed' }
    if ($Mode -eq 'dry-run') { $WhatIf = $true }
    foreach ($action in @($json.actions)) {
        $actionTool = [string]$action.tool
        if ($actionTool -ne $toolKey -and $actionTool -ne 'shared') { continue }
        $operation = [string]$action.operation
        $paths = Resolve-V2ActionPaths -Action $action
        $source = $paths.Source
        $target = $paths.Target
        if ($operation -eq 'replace' -and $Mode -ne 'replace-listed') {
            $script:skipped += "replace-requires-mode:$target"
            continue
        }
        if ($operation -eq 'prune-candidate' -and $Mode -ne 'sync-prune') {
            $script:skipped += "prune-requires-mode:$target"
            continue
        }
        if ($operation -eq 'skip') {
            $script:skipped += "skip:$target"
            continue
        }
        if ($operation -eq 'install') {
            if (Test-Path -LiteralPath $target) {
                $script:skipped += "exists:$target"
                continue
            }
            if ($WhatIf) {
                $script:planned += "install:$target"
                continue
            }
            $parent = Split-Path -Parent $target
            if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            Copy-Item -LiteralPath $source -Destination $target -Recurse
            $script:installed += $target
            continue
        }
        if ($operation -eq 'replace') {
            if ($WhatIf) {
                $script:planned += "replace:$target"
                continue
            }
            if (Test-Path -LiteralPath $target) {
                $backupPath = Join-Path $backupRoot ((New-Guid).Guid)
                $backupParent = Split-Path -Parent $backupPath
                if (-not (Test-Path -LiteralPath $backupParent)) { New-Item -ItemType Directory -Path $backupParent -Force | Out-Null }
                Copy-Item -LiteralPath $target -Destination $backupPath -Recurse
                Remove-Item -LiteralPath $target -Recurse -Force
            }
            $parent = Split-Path -Parent $target
            if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            Copy-Item -LiteralPath $source -Destination $target -Recurse
            $script:installed += $target
            continue
        }
        if ($operation -eq 'prune-candidate') {
            if ($WhatIf) {
                $script:planned += "prune:$target"
                continue
            }
            if (Test-Path -LiteralPath $target) {
                $backupPath = Join-Path $backupRoot ((New-Guid).Guid)
                $backupParent = Split-Path -Parent $backupPath
                if (-not (Test-Path -LiteralPath $backupParent)) { New-Item -ItemType Directory -Path $backupParent -Force | Out-Null }
                Copy-Item -LiteralPath $target -Destination $backupPath -Recurse
                Remove-Item -LiteralPath $target -Recurse -Force
            }
            $script:installed += "pruned:$target"
            continue
        }
        throw "Unsupported action operation: $operation"
    }
    Write-Host 'Manifest install summary'
    Write-Host ("Tool: $Tool")
    Write-Host ("Mode: $Mode")
    Write-Host ('Dry run: ' + $WhatIf.IsPresent)
    Write-Host ('Planned: ' + (($planned -join '; ')))
    Write-Host ('Installed: ' + (($installed -join '; ')))
    Write-Host ('Skipped: ' + (($skipped -join '; ')))
    exit 0
}
if ($json.version -ne 1) { throw 'Manifest version must be 1 or 2.' }

$userBlock = if ($null -ne $json.user) { $json.user.PSObject.Properties[$ToolKey].Value } else { $null }
Add-ManifestEntries -Block $userBlock -Context "user.$ToolKey" -SkillTargetRoot $UserSkillTargetRoot -WorkflowTargetRoot $UserWorkflowTargetRoot

if ($null -ne $json.projects) {
    if ($json.projects -isnot [System.Collections.IEnumerable] -or $json.projects -is [string]) {
        throw 'projects must be an array.'
    }
    foreach ($project in $json.projects) {
        if ($null -eq $project.path -or [string]::IsNullOrWhiteSpace($project.path)) {
            throw 'Every project entry must include path.'
        }
        $projectRoot = Resolve-ManifestProjectPath $project.path
        $projectBlock = $project.PSObject.Properties[$ToolKey].Value
        $projectSkillTargetRoot = Join-Path $projectRoot $SkillFolder
        $projectWorkflowTargetRoot = Join-Path $projectRoot '.agent-routines\workflows'
        Add-ManifestEntries -Block $projectBlock -Context "projects[$projectRoot].$ToolKey" -SkillTargetRoot $projectSkillTargetRoot -WorkflowTargetRoot $projectWorkflowTargetRoot
    }
}

foreach ($entry in $entries) {
    if (-not (Test-Path -LiteralPath $entry.Source)) {
        $errors += "Missing $($entry.Kind): $($entry.Name)"
    }
}
if ($errors.Count -gt 0) {
    throw ($errors -join "`n")
}

foreach ($entry in $entries) {
    Copy-DirectorySafe -Source $entry.Source -Target $entry.Target
}

Write-Host 'Manifest install summary'
Write-Host ("Tool: $Tool")
Write-Host ('Dry run: ' + $WhatIf.IsPresent)
Write-Host ('Planned: ' + (($planned -join '; ')))
Write-Host ('Installed: ' + (($installed -join '; ')))
Write-Host ('Skipped: ' + (($skipped -join '; ')))
