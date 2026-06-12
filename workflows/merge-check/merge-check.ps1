param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\merge-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'merge-check'
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

function Invoke-GitText {
    param([string[]]$Arguments)
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        return @{ Ok = $false; Text = 'git not found' }
    }
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & git @Arguments 2>&1 | ForEach-Object { $_.ToString() }
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $oldPreference
    }
    return @{ Ok = ($code -eq 0); Text = (($output -join "`n").Trim()) }
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

    $inside = Invoke-GitText @('rev-parse', '--is-inside-work-tree')
    if ($inside.Ok) {
        $mergeHeadPath = Invoke-GitText @('rev-parse', '--git-path', 'MERGE_HEAD')
        $mergeHead = $mergeHeadPath.Ok -and (Test-Path -LiteralPath $mergeHeadPath.Text)
        Add-Check 'merge-state' $true $(if ($mergeHead) { 'Merge in progress.' } else { 'No merge in progress.' })
        $unmerged = Invoke-GitText @('diff', '--name-only', '--diff-filter=U')
        Add-Check 'unresolved-files' ([string]::IsNullOrWhiteSpace($unmerged.Text)) $unmerged.Text -Required
        $cached = Invoke-GitText @('diff', '--cached', '--check')
        Add-Check 'cached-diff-check' $cached.Ok $cached.Text -Required
    } else {
        Add-Warning 'Skipping git merge checks because this is not a git repository or git is unavailable.'
    }
    $markers = Get-ChildItem -File -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '[\\/]\.git([\\/]|$)' -and $_.Length -lt 1048576 } | Select-String -Pattern '^(<<<<<<<|=======|>>>>>>>)' -ErrorAction SilentlyContinue
    Add-Check 'conflict-markers' (-not $markers) $(if ($markers) { (($markers | Select-Object -First 20 | ForEach-Object { "$($_.Path):$($_.LineNumber)" }) -join '; ') } else { 'No conflict markers found.' }) -Required
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false } else { $Result.ok = $true }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
