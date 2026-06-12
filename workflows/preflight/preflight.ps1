param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\preflight.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'preflight'
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
    if (-not $inside.Ok) {
        Add-Warning 'Directory is not a git repository or git is unavailable.'
    } else {
        Add-Check 'git-repository' $true 'Inside a git work tree.'
        $branch = Invoke-GitText @('branch', '--show-current')
        Add-Check 'git-branch' $branch.Ok $branch.Text
        $head = Invoke-GitText @('rev-parse', '--verify', 'HEAD')
        if ($head.Ok) {
            Add-Check 'git-head' $true $head.Text
        } else {
            Add-Check 'git-head' $false 'No HEAD commit found.'
            Add-Warning 'No git HEAD commit was found; repository may be on an unborn branch.'
        }
        $status = Invoke-GitText @('status', '--short')
        Add-Check 'git-status' $status.Ok $(if ([string]::IsNullOrWhiteSpace($status.Text)) { 'clean' } else { $status.Text })
    }
    $rules = @('AGENTS.md','CLAUDE.md','.codex','.claude','.agent-routines','docs','plans')
    foreach ($rule in $rules) {
        Add-Check "rule-presence:$rule" (Test-Path -LiteralPath (Join-Path (Get-Location) $rule)) 'Rule or documentation path probe.'
    }
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false } else { $Result.ok = $true }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
