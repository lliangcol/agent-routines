param(
    [string]$Path = '.',
    [string]$Sql = '',
    [string]$SqlFile = '',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\db-read.ps1 [-Path <path>] [-Sql <query>] [-SqlFile <file>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'db-read'
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

function Test-ReadonlySql {
    param([string]$Query)
    if ([string]::IsNullOrWhiteSpace($Query)) {
        Add-Warning 'No SQL provided. This workflow validates readonly SQL only and never connects to a database.'
        return
    }
    $blocked = '(?i)\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke|merge|call|execute|into|copy|load|attach|vacuum|lock)\b'
    if ($Query -match $blocked) {
        Add-Error 'SQL rejected because it contains write, DDL, or execution keywords.'
    } else {
        Add-Check 'readonly-sql' $true 'SQL passed keyword validation. Integrate a project-owned readonly wrapper before real use.'
    }
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

    $query = $Sql
    if ($SqlFile) {
        if (Test-Path -LiteralPath $SqlFile) {
            $query = Get-Content -LiteralPath $SqlFile -Raw
        } else {
            Add-Error "SQL file not found: $SqlFile"
        }
    }
    Test-ReadonlySql $query
    Add-Warning 'No database connection is opened by this workflow.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false } else { $Result.ok = $true }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
