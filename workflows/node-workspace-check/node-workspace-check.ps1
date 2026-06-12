param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\node-workspace-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'node-workspace-check'
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

function Add-Warning { param([string]$Message) $script:Result.warnings += $Message }
function Add-Error { param([string]$Message) $script:Result.errors += $Message }
function Add-CommandProbe { param([string]$Name) $cmd = Get-Command $Name -ErrorAction SilentlyContinue; Add-Check "command:$Name" ([bool]$cmd) $(if ($cmd) { $cmd.Source } else { 'Command not found.' }) }

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    foreach ($name in @('node','npm','pnpm','yarn')) { Add-CommandProbe $name }
    $packagePath = Join-Path (Get-Location) 'package.json'
    Add-Check 'package-json' (Test-Path -LiteralPath $packagePath) 'Root package.json probe.'
    foreach ($item in @('pnpm-workspace.yaml','package-lock.json','pnpm-lock.yaml','yarn.lock','turbo.json','nx.json')) {
        Add-Check "workspace-file:$item" (Test-Path -LiteralPath (Join-Path (Get-Location) $item)) 'Workspace metadata probe.'
    }
    if (Test-Path -LiteralPath $packagePath) {
        $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
        Add-Check 'package-manager-field' (-not [string]::IsNullOrWhiteSpace($package.packageManager)) $(if ($package.packageManager) { $package.packageManager } else { 'packageManager not declared.' })
        $scriptNames = @($package.scripts.PSObject.Properties.Name)
        foreach ($script in @('doctor','validate','test','lint','build','pack','release','publish')) {
            Add-Check "script:$script" ($scriptNames -contains $script) 'package.json script probe.'
        }
    }
    Add-Warning 'This workflow does not install dependencies, mutate versions, or publish packages.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
