param(
    [string]$Path = '.',
    [string[]]$CustomCommand = @(),
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\doc-check.ps1 [-Path <path>] [-CustomCommand <command>]"
    Write-Host "Produces stable JSON. Built-in checks are readonly. Custom commands run as given"
    Write-Host "after a best-effort destructive-keyword filter; pass readonly commands only."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'doc-check'
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

function Invoke-SafeCustomCommand {
    param([string]$Command)
    if ([string]::IsNullOrWhiteSpace($Command)) { return }
    if ($Command -match '(?i)\b(rm|del|erase|remove-item|rmdir|rd|format|shutdown|reboot|drop|delete|truncate|alter|insert|update|merge|grant|revoke|call|execute)\b') {
        Add-Error "Rejected potentially destructive custom command: $Command"
        return
    }
    $shell = if ($env:OS -eq 'Windows_NT') { 'cmd.exe' } else { 'sh' }
    $args = if ($env:OS -eq 'Windows_NT') { @('/c', $Command) } else { @('-c', $Command) }
    $output = & $shell @args 2>&1
    $code = $LASTEXITCODE
    Add-Check "custom-command" ($code -eq 0) (($output | Out-String).Trim()) -Required
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

    Add-Check 'readme-present' (Test-Path -LiteralPath (Join-Path (Get-Location) 'README.md')) 'Root README.md probe.' -Required
    Add-Check 'docs-present' (Test-Path -LiteralPath (Join-Path (Get-Location) 'docs')) 'docs directory probe.' -Required
    if (Get-Command python -ErrorAction SilentlyContinue) {
        Add-Check 'python-detected' $true 'python is available for optional documentation commands.'
    } else {
        Add-Warning 'python was not found; Python-based doc checks were skipped.'
    }
    if ($CustomCommand.Count -gt 0) {
        Add-Warning 'Custom commands are screened by a best-effort keyword denylist only; the caller is responsible for passing readonly commands.'
        foreach ($command in $CustomCommand) { Invoke-SafeCustomCommand $command }
    }
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false } else { $Result.ok = $true }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
