param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\commit-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'commit-check'
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
    if ($Required -and -not $Ok) { Add-Error "Required check failed: $Name" }
}

function Add-Warning { param([string]$Message) $script:Result.warnings += $Message }
function Add-Error { param([string]$Message) $script:Result.errors += $Message }

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

function Count-Lines {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return 0 }
    return @($Text -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }).Count
}

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    $inside = Invoke-GitText @('rev-parse', '--is-inside-work-tree')
    Add-Check 'git-repository' $inside.Ok $(if ($inside.Ok) { 'Inside a git work tree.' } else { $inside.Text }) -Required
    if ($inside.Ok) {
        $branch = Invoke-GitText @('branch', '--show-current')
        Add-Check 'git-branch' $branch.Ok $(if ([string]::IsNullOrWhiteSpace($branch.Text)) { 'Detached HEAD or unnamed branch.' } else { $branch.Text })
        $head = Invoke-GitText @('rev-parse', '--verify', 'HEAD')
        Add-Check 'git-head' $head.Ok $(if ($head.Ok) { $head.Text } else { 'No HEAD commit found.' })
        $status = Invoke-GitText @('status', '--short', '--untracked-files=all')
        Add-Check 'git-status' $status.Ok $(if ([string]::IsNullOrWhiteSpace($status.Text)) { 'clean' } else { $status.Text })

        $staged = Invoke-GitText @('diff', '--cached', '--name-only')
        Add-Check 'staged-files' $staged.Ok ("{0} staged files." -f (Count-Lines $staged.Text))
        $unstaged = Invoke-GitText @('diff', '--name-only')
        Add-Check 'unstaged-files' $unstaged.Ok ("{0} unstaged files." -f (Count-Lines $unstaged.Text))
        $untracked = Invoke-GitText @('ls-files', '--others', '--exclude-standard')
        Add-Check 'untracked-files' $untracked.Ok ("{0} untracked files." -f (Count-Lines $untracked.Text))

        $name = Invoke-GitText @('config', '--get', 'user.name')
        $email = Invoke-GitText @('config', '--get', 'user.email')
        Add-Check 'git-user-name' ($name.Ok -and -not [string]::IsNullOrWhiteSpace($name.Text)) $(if ($name.Text) { $name.Text } else { 'user.name is not configured.' })
        Add-Check 'git-user-email' ($email.Ok -and -not [string]::IsNullOrWhiteSpace($email.Text)) $(if ($email.Text) { $email.Text } else { 'user.email is not configured.' })
        if (-not $name.Ok -or [string]::IsNullOrWhiteSpace($name.Text) -or -not $email.Ok -or [string]::IsNullOrWhiteSpace($email.Text)) {
            Add-Warning 'Git identity is incomplete; commit commands may need repo-specific one-off identity flags.'
        }

        $diffCheck = Invoke-GitText @('diff', '--check')
        Add-Check 'git-diff-check' $diffCheck.Ok $(if ($diffCheck.Text) { $diffCheck.Text } else { 'No whitespace errors in unstaged diff.' }) -Required
        $cachedCheck = Invoke-GitText @('diff', '--cached', '--check')
        Add-Check 'git-diff-cached-check' $cachedCheck.Ok $(if ($cachedCheck.Text) { $cachedCheck.Text } else { 'No whitespace errors in staged diff.' }) -Required
    }
    Add-Warning 'This workflow does not stage, commit, push, tag, or rewrite history.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
