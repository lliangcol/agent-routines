param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\release-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'release-check'
$OriginalLocation = Get-Location

function Get-AgentRoutineOs {
    if ($env:OS -eq 'Windows_NT') { return 'windows' }
    if ($IsMacOS) { return 'macos' }
    if ($IsLinux) { return 'linux' }
    return 'unknown'
}

function Add-Check { param([string]$Name, [bool]$Ok, [string]$Details) $script:Result.checks += [ordered]@{ name = $Name; ok = $Ok; details = $Details } }
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

    foreach ($item in @('README.md','README.zh-CN.md','LICENSE','CHANGELOG.md','SECURITY.md','SUPPORT.md','package.json','pyproject.toml','.github/workflows')) {
        Add-Check "release-path:$item" (Test-Path -LiteralPath (Join-Path (Get-Location) $item)) 'Release surface path probe.'
    }

    foreach ($name in @('node','npm','pnpm','python','python3','git')) { Add-CommandProbe $name }

    $packageJson = Join-Path (Get-Location) 'package.json'
    if (Test-Path -LiteralPath $packageJson) {
        $package = Get-Content -LiteralPath $packageJson -Raw | ConvertFrom-Json
        Add-Check 'package-name' (-not [string]::IsNullOrWhiteSpace($package.name)) $(if ($package.name) { $package.name } else { 'package.json name is missing.' })
        Add-Check 'package-version' (-not [string]::IsNullOrWhiteSpace($package.version)) $(if ($package.version) { $package.version } else { 'package.json version is missing.' })
        Add-Check 'package-files-field' ($null -ne $package.files) $(if ($null -ne $package.files) { 'package.json files field is declared.' } else { 'package.json files field is not declared.' })
    }

    $pyproject = Join-Path (Get-Location) 'pyproject.toml'
    if (Test-Path -LiteralPath $pyproject) {
        $text = Get-Content -LiteralPath $pyproject -Raw
        Add-Check 'pyproject-project-table' ($text -match '(?m)^\[project\]') 'pyproject.toml [project] table probe.'
        Add-Check 'pyproject-build-system' ($text -match '(?m)^\[build-system\]') 'pyproject.toml [build-system] table probe.'
    }

    if (-not (Test-Path -LiteralPath $packageJson) -and -not (Test-Path -LiteralPath $pyproject)) {
        Add-Warning 'No package.json or pyproject.toml was found; release ecosystem could not be inferred.'
    }
    Add-Warning 'This workflow does not publish, tag, push, mutate versions, install dependencies, or create release artifacts.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
