param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('codex','claude-code')]
    [string]$Tool,
    [string]$ManifestPath = '',
    [switch]$Force,
    [switch]$WhatIf,
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: install-manifest.ps1 -Tool codex|claude-code -ManifestPath <path> [-Force] [-WhatIf]'
    exit 0
}

$ErrorActionPreference = 'Stop'
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

$json = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
if ($json.version -ne 1) { throw 'Manifest version must be 1.' }

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
