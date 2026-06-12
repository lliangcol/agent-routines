param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\maven-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'maven-check'
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

function Add-CommandProbe {
    param([string]$Name)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    Add-Check "command:$Name" ([bool]$command) $(if ($command) { $command.Source } else { 'Command not found.' })
}

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    foreach ($name in @('mvn','java','git')) { Add-CommandProbe $name }
    Add-Check 'root-pom' (Test-Path -LiteralPath (Join-Path (Get-Location) 'pom.xml')) 'Root pom.xml probe.'
    Add-Check 'maven-wrapper' (Test-Path -LiteralPath (Join-Path (Get-Location) 'mvnw')) 'Maven wrapper probe.'
    $settings = Join-Path $HOME '.m2\settings.xml'
    if (Test-Path -LiteralPath $settings) {
        $text = Get-Content -LiteralPath $settings -Raw
        $wildcard = $text -match '<mirrorOf>\s*\*\s*</mirrorOf>'
        Add-Check 'user-settings' $true $settings
        Add-Check 'mirrorof-wildcard' (-not $wildcard) 'Checks whether user Maven settings force mirrorOf=*.'
        if ($wildcard) { Add-Warning 'User Maven settings contain mirrorOf=*; dependency failures may be mirror-related.' }
    } else {
        Add-Check 'user-settings' $false 'No user Maven settings.xml found.'
    }
    if ($env:OS -eq 'Windows_NT') {
        Add-Warning 'When running Maven from PowerShell, quote -D properties such as "-Dtest=SomeTest".'
    }
    Add-Warning 'This workflow does not edit Maven settings, delete caches, or run builds.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
