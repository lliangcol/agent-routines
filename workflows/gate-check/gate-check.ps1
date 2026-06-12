param(
    [string]$Path = '.',
    [string[]]$CustomCommand = @(),
    [string]$Sql = '',
    [string]$SqlFile = '',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\gate-check.ps1 [-Path <path>] [-CustomCommand <command>] [-Sql <query>] [-SqlFile <file>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'gate-check'
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

function Test-ReadonlySql {
    param([string]$Query)
    if ([string]::IsNullOrWhiteSpace($Query)) {
        Add-Warning 'No SQL provided. This workflow validates readonly SQL only and never connects to a database.'
        return
    }
    $blocked = '(?i)\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke|merge|call|execute)\b'
    if ($Query -match $blocked) {
        Add-Error 'SQL rejected because it contains write, DDL, or execution keywords.'
    } else {
        Add-Check 'readonly-sql' $true 'SQL passed keyword validation. Integrate a project-owned readonly wrapper before real use.'
    }
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

    switch ($WorkflowName) {
        'preflight' {
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
        }
        'gate-check' {
            $inside = Invoke-GitText @('rev-parse', '--is-inside-work-tree')
            if ($inside.Ok) {
                $unstaged = Invoke-GitText @('diff', '--check')
                Add-Check 'git-diff-check' $unstaged.Ok $unstaged.Text -Required
                $staged = Invoke-GitText @('diff', '--cached', '--check')
                Add-Check 'git-diff-cached-check' $staged.Ok $staged.Text -Required
            } else {
                Add-Warning 'Skipping git gates because this is not a git repository or git is unavailable.'
            }
            foreach ($command in $CustomCommand) { Invoke-SafeCustomCommand $command }
        }
        'merge-check' {
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
        }
        'archive-check' {
            $executionRoot = Join-Path (Get-Location) 'executions'
            if (-not (Test-Path -LiteralPath $executionRoot)) {
                Add-Warning 'No executions directory found.'
            } else {
                $dirs = Get-ChildItem -LiteralPath $executionRoot -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '[\\/]\d{4}[\\/]\d{2}[\\/]\d{4}-\d{2}-\d{2}T\d{4}[+-]\d{4}-[a-z0-9-]+$' }
                foreach ($dir in $dirs) {
                    Add-Check "archive:$($dir.Name):README" (Test-Path -LiteralPath (Join-Path $dir.FullName 'README.md')) 'README.md required.' -Required
                    Add-Check "archive:$($dir.Name):result" (Test-Path -LiteralPath (Join-Path $dir.FullName 'result.md')) 'result.md required.' -Required
                    Add-Check "archive:$($dir.Name):evidence" (Test-Path -LiteralPath (Join-Path $dir.FullName 'evidence')) 'evidence directory required.' -Required
                    Add-Check "archive:$($dir.Name):artifacts" (Test-Path -LiteralPath (Join-Path $dir.FullName 'artifacts')) 'artifacts directory required.' -Required
                }
                if (-not $dirs) { Add-Warning 'No archive execution directories matched the expected layout.' }
            }
        }
        'db-read' {
            $query = $Sql
            if ($SqlFile) {
                if (Test-Path -LiteralPath $SqlFile) {
                    $query = Get-Content -LiteralPath $SqlFile -Raw
                } else {
                    Add-Error "SQL file not found: $SqlFile"
                }
            }
            Test-ReadonlySql $query
            Add-Warning 'No database connection is opened by this workflow.'
        }
        'doc-check' {
            Add-Check 'readme-present' (Test-Path -LiteralPath (Join-Path (Get-Location) 'README.md')) 'Root README.md probe.' -Required
            Add-Check 'docs-present' (Test-Path -LiteralPath (Join-Path (Get-Location) 'docs')) 'docs directory probe.' -Required
            if (Get-Command python -ErrorAction SilentlyContinue) {
                Add-Check 'python-detected' $true 'python is available for optional documentation commands.'
            } else {
                Add-Warning 'python was not found; Python-based doc checks were skipped.'
            }
            foreach ($command in $CustomCommand) { Invoke-SafeCustomCommand $command }
        }
    }
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false } else { $Result.ok = $true }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
