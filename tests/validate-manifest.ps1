param(
    [string]$ManifestPath = '',
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: .\tests\validate-manifest.ps1 -ManifestPath <path>'
    exit 0
}

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    throw 'ManifestPath is required. Use -ManifestPath <path>.'
}

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$manifest = (Resolve-Path -LiteralPath $ManifestPath).Path
$skillRoot = Join-Path $root 'skills'
$workflowRoot = Join-Path $root 'workflows'
$errors = @()

function Resolve-ManifestProjectPath {
    param([string]$ProjectPath)
    if ([System.IO.Path]::IsPathRooted($ProjectPath)) { return $ProjectPath }
    return (Join-Path $root $ProjectPath)
}

function Get-Names {
    param([object]$Block, [string]$PropertyName, [string]$Context)
    if ($null -eq $Block) { return @() }
    $prop = $Block.PSObject.Properties[$PropertyName]
    if ($null -eq $prop -or $null -eq $prop.Value) { return @() }
    if ($prop.Value -isnot [System.Collections.IEnumerable] -or $prop.Value -is [string]) {
        $script:errors += "$Context.$PropertyName must be an array."
        return @()
    }
    $result = @()
    $seen = @{}
    foreach ($item in $prop.Value) {
        if ($item -isnot [string] -or [string]::IsNullOrWhiteSpace($item) -or $item -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
            $script:errors += "$Context.$PropertyName contains invalid name: $item"
            continue
        }
        if ($seen.ContainsKey($item)) {
            $script:errors += "$Context.$PropertyName contains duplicate name: $item"
            continue
        }
        $seen[$item] = $true
        $result += $item
    }
    return $result
}

function Test-Block {
    param([object]$Block, [string]$Context)
    foreach ($skill in (Get-Names -Block $Block -PropertyName 'skills' -Context $Context)) {
        if (-not (Test-Path -LiteralPath (Join-Path $skillRoot $skill))) { $script:errors += "Missing skill: $skill" }
    }
    foreach ($workflow in (Get-Names -Block $Block -PropertyName 'workflows' -Context $Context)) {
        if (-not (Test-Path -LiteralPath (Join-Path $workflowRoot $workflow))) { $script:errors += "Missing workflow: $workflow" }
    }
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
    if ([System.IO.Path]::IsPathRooted($ProjectPath)) { return [System.IO.Path]::GetFullPath($ProjectPath) }
    return [System.IO.Path]::GetFullPath((Join-Path $root $ProjectPath))
}

function Get-ExpectedV2Source {
    param([string]$Kind, [string]$Name)
    if ($Kind -eq 'skill') { return (Join-Path $skillRoot $Name) }
    if ($Kind -eq 'workflow') { return (Join-Path $workflowRoot $Name) }
    return $null
}

function Get-ExpectedV2Target {
    param([object]$Action)
    $kind = [string]$Action.kind
    $name = [string]$Action.name
    $scope = [string]$Action.scope
    $tool = [string]$Action.tool
    if ($kind -eq 'workflow') {
        if ($tool -ne 'shared') {
            $script:errors += 'Workflow actions must use tool shared.'
            return $null
        }
        if ($scope -eq 'user') { return (Join-Path $HOME ".agent-routines\workflows\$name") }
        if ($scope -eq 'project') {
            if ([string]::IsNullOrWhiteSpace([string]$Action.projectPath)) {
                $script:errors += 'Project-scoped actions must include projectPath.'
                return $null
            }
            $projectRoot = Resolve-ManifestProjectPathLoose -ProjectPath ([string]$Action.projectPath)
            if (-not (Test-Path -LiteralPath $projectRoot)) { $script:errors += "Missing project path: $($Action.projectPath)" }
            return (Join-Path (Join-Path $projectRoot '.agent-routines\workflows') $name)
        }
    } elseif ($kind -eq 'skill') {
        if (@('codex','claudeCode') -notcontains $tool) {
            $script:errors += "Skill action tool must be codex or claudeCode: $tool"
            return $null
        }
        $skillFolder = if ($tool -eq 'codex') { '.codex\skills' } else { '.claude\skills' }
        if ($scope -eq 'user') {
            $skillRootPath = if ($tool -eq 'codex') { Join-Path $HOME '.codex\skills' } else { Join-Path $HOME '.claude\skills' }
            return (Join-Path $skillRootPath $name)
        }
        if ($scope -eq 'project') {
            if ([string]::IsNullOrWhiteSpace([string]$Action.projectPath)) {
                $script:errors += 'Project-scoped actions must include projectPath.'
                return $null
            }
            $projectRoot = Resolve-ManifestProjectPathLoose -ProjectPath ([string]$Action.projectPath)
            if (-not (Test-Path -LiteralPath $projectRoot)) { $script:errors += "Missing project path: $($Action.projectPath)" }
            return (Join-Path (Join-Path $projectRoot $skillFolder) $name)
        }
    }
    $script:errors += "Unsupported action scope or kind: $scope/$kind"
    return $null
}

function Test-V2ActionPaths {
    param([object]$Action)
    $kind = [string]$Action.kind
    $name = [string]$Action.name
    $expectedSource = Get-ExpectedV2Source -Kind $kind -Name $name
    $expectedTarget = Get-ExpectedV2Target -Action $Action
    if ($null -eq $expectedSource -or $null -eq $expectedTarget) { return }
    if (-not (Test-SamePath -Actual ([string]$Action.sourcePath) -Expected $expectedSource)) {
        $script:errors += "action.sourcePath does not match expected source for $kind ${name}: $($Action.sourcePath)"
    }
    if (-not (Test-SamePath -Actual ([string]$Action.targetPath) -Expected $expectedTarget)) {
        $script:errors += "action.targetPath does not match expected target for $kind ${name}: $($Action.targetPath)"
    }
    if ([string]$Action.operation -ne 'prune-candidate' -and -not (Test-Path -LiteralPath $expectedSource)) {
        $script:errors += "Missing source path: $expectedSource"
    }
}

$json = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
if ($json.version -eq 2) {
    if ($null -eq $json.desiredTargets -or $json.desiredTargets -is [string] -or $json.desiredTargets -isnot [System.Collections.IEnumerable]) {
        $errors += 'desiredTargets must be an array.'
    }
    if ($null -eq $json.actions -or $json.actions -is [string] -or $json.actions -isnot [System.Collections.IEnumerable]) {
        $errors += 'actions must be an array.'
    }
    foreach ($action in @($json.actions)) {
        $hasRequiredFields = $true
        foreach ($name in @('operation','kind','name','sourcePath','targetPath','tool','scope')) {
            if ($null -eq $action.PSObject.Properties[$name] -or [string]::IsNullOrWhiteSpace([string]$action.PSObject.Properties[$name].Value)) {
                $errors += "action.$name is required."
                $hasRequiredFields = $false
            }
        }
        if ($null -ne $action.name -and [string]$action.name -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
            $errors += "action.name contains invalid name: $($action.name)"
        }
        if ($null -ne $action.operation -and @('install','skip','replace','prune-candidate') -notcontains [string]$action.operation) {
            $errors += "Unsupported action operation: $($action.operation)"
        }
        if ($null -ne $action.kind -and @('skill','workflow') -notcontains [string]$action.kind) {
            $errors += "Unsupported action kind: $($action.kind)"
        }
        if ($null -ne $action.scope -and @('user','project') -notcontains [string]$action.scope) {
            $errors += "Unsupported action scope: $($action.scope)"
        }
        if ($null -ne $action.tool -and @('codex','claudeCode','shared') -notcontains [string]$action.tool) {
            $errors += "Unsupported action tool: $($action.tool)"
        }
        if ($hasRequiredFields) {
            Test-V2ActionPaths -Action $action
        }
    }
    if ($null -eq $json.backupPlan) { $errors += 'backupPlan is required.' }
    if ($null -eq $json.restorePlan) { $errors += 'restorePlan is required.' }
    if ($null -eq $json.summary) { $errors += 'summary is required.' }
    if ($errors.Count -gt 0) {
        Write-Error ($errors -join "`n")
        exit 1
    }
    Write-Host 'validate-manifest: ok'
    exit 0
}
if ($json.version -ne 1) { $errors += 'Manifest version must be 1 or 2.' }

foreach ($toolKey in @('codex','claudeCode')) {
    $block = if ($null -ne $json.user -and $null -ne $json.user.PSObject.Properties[$toolKey]) { $json.user.PSObject.Properties[$toolKey].Value } else { $null }
    Test-Block -Block $block -Context "user.$toolKey"
}

if ($null -ne $json.projects) {
    if ($json.projects -isnot [System.Collections.IEnumerable] -or $json.projects -is [string]) {
        $errors += 'projects must be an array.'
    } else {
        foreach ($project in $json.projects) {
            if ($null -eq $project.path -or [string]::IsNullOrWhiteSpace($project.path)) {
                $errors += 'Every project entry must include path.'
                continue
            }
            $projectPath = Resolve-ManifestProjectPath $project.path
            if (-not (Test-Path -LiteralPath $projectPath)) {
                $errors += "Missing project path: $($project.path)"
            }
            foreach ($toolKey in @('codex','claudeCode')) {
                $block = if ($null -ne $project.PSObject.Properties[$toolKey]) { $project.PSObject.Properties[$toolKey].Value } else { $null }
                Test-Block -Block $block -Context "projects[$($project.path)].$toolKey"
            }
        }
    }
}

if ($errors.Count -gt 0) {
    Write-Error ($errors -join "`n")
    exit 1
}
Write-Host 'validate-manifest: ok'
