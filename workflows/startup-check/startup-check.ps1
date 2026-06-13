param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\startup-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'startup-check'

function Get-AgentRoutineOs {
    if ($env:OS -eq 'Windows_NT') { return 'windows' }
    if ($IsMacOS) { return 'macos' }
    if ($IsLinux) { return 'linux' }
    return 'unknown'
}

function Add-Check {
    param([string]$Name, [bool]$Ok, [string]$Details)
    $script:Result.checks += [ordered]@{ name = $Name; ok = $Ok; details = $Details }
}

function Add-Warning { param([string]$Message) $script:Result.warnings += $Message }
function Add-Error { param([string]$Message) $script:Result.errors += $Message }

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (-not (Test-Path -LiteralPath $Path)) { Add-Error "Path does not exist: $Path" }
    if ($env:OS -ne 'Windows_NT') {
        Add-Warning 'Windows startup sources are only available on Windows.'
    } else {
        foreach ($key in @(
            'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run',
            'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run',
            'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run',
            'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'
        )) {
            $displayKey = $key -replace ':', ''
            if (Test-Path -LiteralPath $key) {
                $props = Get-ItemProperty -LiteralPath $key
                $names = @($props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | Select-Object -ExpandProperty Name)
                Add-Check "registry:$displayKey" $true "$($names.Count) entries: $($names -join ', ')"
            } else {
                Add-Check "registry:$displayKey" $false 'Registry key not found.'
            }
        }
        if (Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue) {
            $tasks = Get-ScheduledTask | Where-Object { $_.TaskName -match '(?i)(startup|logon|onedrive|nvidia|nvnode)' } | Select-Object -First 30
            Add-Check 'scheduled-task-probe' $true "$($tasks.Count) startup-like scheduled tasks matched, capped at 30."
        } else {
            Add-Warning 'Get-ScheduledTask is unavailable in this shell.'
        }
        Add-Warning 'This workflow only reads startup sources; it does not remove registry values or disable tasks.'
    }
} catch {
    Add-Error $_.Exception.Message
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
