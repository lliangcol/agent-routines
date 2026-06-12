param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\archive-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'archive-check'
$OriginalLocation = Get-Location

function Get-AgentRoutineOs {
    if ($env:OS -eq 'Windows_NT') { return 'windows' }
    if ($IsMacOS) { return 'macos' }
    if ($IsLinux) { return 'linux' }
    return 'unknown'
}

function Add-Check {
    param([string]$Name, [bool]$Ok, [string]$Details, [switch]$Required)
    $script:Result.checks += [ordered]@{ name = $Name; ok = $Ok; details = $Details }
    if ($Required -and -not $Ok) {
        Add-Error "Required check failed: $Name"
    }
}

function Add-Warning {
    param([string]$Message)
    $script:Result.warnings += $Message
}

function Add-Error {
    param([string]$Message)
    $script:Result.errors += $Message
}

$ResolvedPath = $null
if (Test-Path -LiteralPath $Path) {
    $ResolvedPath = (Resolve-Path -LiteralPath $Path).Path
} else {
    $ResolvedPath = $Path
}

$script:Result = [ordered]@{
    ok = $true
    workflow = $WorkflowName
    cwd = $ResolvedPath
    os = Get-AgentRoutineOs
    checks = @()
    warnings = @()
    errors = @()
}

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    $executionRoot = Join-Path (Get-Location) 'executions'
    if (-not (Test-Path -LiteralPath $executionRoot)) {
        Add-Warning 'No executions directory found.'
    } else {
        $dirs = Get-ChildItem -LiteralPath $executionRoot -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '[\\/]\d{4}[\\/]\d{2}[\\/]\d{4}-\d{2}-\d{2}T\d{4}[+-]\d{4}-[a-z0-9-]+$' }
        foreach ($dir in $dirs) {
            Add-Check "archive:$($dir.Name):README" (Test-Path -LiteralPath (Join-Path $dir.FullName 'README.md')) 'README.md required.' -Required
            Add-Check "archive:$($dir.Name):result" (Test-Path -LiteralPath (Join-Path $dir.FullName 'result.md')) 'result.md required.' -Required
            Add-Check "archive:$($dir.Name):evidence" (Test-Path -LiteralPath (Join-Path $dir.FullName 'evidence')) 'evidence directory required.' -Required
            Add-Check "archive:$($dir.Name):artifacts" (Test-Path -LiteralPath (Join-Path $dir.FullName 'artifacts')) 'artifacts directory required.' -Required
        }
        if (-not $dirs) { Add-Warning 'No archive execution directories matched the expected layout.' }
    }
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false } else { $Result.ok = $true }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
