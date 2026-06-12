param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\runtime-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'runtime-check'
$OriginalLocation = Get-Location

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

function Add-Warning {
    param([string]$Message)
    $script:Result.warnings += $Message
}

function Add-Error {
    param([string]$Message)
    $script:Result.errors += $Message
}

function Add-CommandProbe {
    param([string]$Name)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        Add-Check "command:$Name" $true $command.Source
    } else {
        Add-Check "command:$Name" $false 'Command not found.'
    }
}

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    Add-Check 'powershell-version' $true $PSVersionTable.PSVersion.ToString()
    Add-Check 'path-env-present' (-not [string]::IsNullOrWhiteSpace($env:PATH)) 'PATH environment variable probe.'
    foreach ($name in @('node','npm','volta','git','bash','python','python3')) { Add-CommandProbe $name }
    Add-Check 'git-bash-common-path' (Test-Path -LiteralPath 'C:\Program Files\Git\bin\bash.exe') 'C:\Program Files\Git\bin\bash.exe'
    Add-Check 'user-claude-settings' (Test-Path -LiteralPath (Join-Path $HOME '.claude\settings.json')) 'User-level runtime settings probe.'
    Add-Check 'user-codex-skills' (Test-Path -LiteralPath (Join-Path $HOME '.codex\skills')) 'User-level Codex skills probe.'
    Add-Check 'project-claude-settings' (Test-Path -LiteralPath (Join-Path (Get-Location) '.claude\settings.json')) 'Project-level runtime settings probe.'
    Add-Check 'project-hook-wrapper' (Test-Path -LiteralPath (Join-Path (Get-Location) '.claude\hooks\run-python-hook.js')) 'Project hook wrapper probe.'
    Add-Check 'pythonioencoding' (-not [string]::IsNullOrWhiteSpace($env:PYTHONIOENCODING)) $(if ($env:PYTHONIOENCODING) { $env:PYTHONIOENCODING } else { 'PYTHONIOENCODING not set.' })
    Add-Check 'pythonutf8' (-not [string]::IsNullOrWhiteSpace($env:PYTHONUTF8)) $(if ($env:PYTHONUTF8) { $env:PYTHONUTF8 } else { 'PYTHONUTF8 not set.' })
    Add-Warning 'This workflow does not reinstall packages, edit settings, or mutate PATH.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
