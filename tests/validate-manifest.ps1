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

$json = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
if ($json.version -ne 1) { $errors += 'Manifest version must be 1.' }

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
