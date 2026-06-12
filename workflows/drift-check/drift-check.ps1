param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\drift-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'drift-check'
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

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    foreach ($item in @('docs','.agents\kb','docs\kb','.driftkb.yml','driftkb.toml')) {
        Add-Check "knowledge-path:$item" (Test-Path -LiteralPath (Join-Path (Get-Location) $item)) 'Knowledge or drift metadata probe.'
    }
    $driftkb = Get-Command driftkb -ErrorAction SilentlyContinue
    Add-Check 'command:driftkb' ([bool]$driftkb) $(if ($driftkb) { $driftkb.Source } else { 'Command not found.' })
    $markdown = Get-ChildItem -File -Recurse -Include *.md -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '[\\/](\.git|node_modules|target)([\\/]|$)' } | Select-Object -First 200
    Add-Check 'markdown-files-scanned' $true "$($markdown.Count) Markdown files scanned, capped at 200."
    $frontmatter = 0
    foreach ($file in $markdown) {
        $first = Get-Content -LiteralPath $file.FullName -TotalCount 1 -ErrorAction SilentlyContinue
        if ($first -eq '---') { $frontmatter++ }
    }
    Add-Check 'markdown-frontmatter-count' $true "$frontmatter files start with YAML frontmatter."
    Add-Warning 'This workflow does not accept fingerprints, promote stubs, or edit documentation.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
