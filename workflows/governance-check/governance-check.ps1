param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\governance-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'governance-check'
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

function Invoke-GitText {
    param([string[]]$Arguments)
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { return @{ Ok = $false; Text = 'git not found' } }
    $output = & git @Arguments 2>&1 | ForEach-Object { $_.ToString() }
    return @{ Ok = ($LASTEXITCODE -eq 0); Text = (($output -join "`n").Trim()) }
}

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    foreach ($item in @('AGENTS.md','CLAUDE.md','.agents','.claude','.agent-routines','.mcp.json')) {
        Add-Check "governance-path:$item" (Test-Path -LiteralPath (Join-Path (Get-Location) $item)) 'Current checkout governance path probe.'
    }
    foreach ($script in @('scripts/verify_claude_governance.py','.agents/tools/validate.py','scripts/sync_agent_assets.py','scripts/agent_governance_gate.py')) {
        Add-Check "governance-script:$script" (Test-Path -LiteralPath (Join-Path (Get-Location) $script)) 'Current checkout script probe.'
    }
    $inside = Invoke-GitText @('rev-parse','--is-inside-work-tree')
    if ($inside.Ok) {
        $branch = Invoke-GitText @('branch','--show-current')
        $status = Invoke-GitText @('status','--short')
        Add-Check 'git-branch' $branch.Ok $branch.Text
        Add-Check 'git-status' $status.Ok $(if ([string]::IsNullOrWhiteSpace($status.Text)) { 'clean' } else { $status.Text })
    } else {
        Add-Warning 'Skipping git governance probes because this is not a git repository or git is unavailable.'
    }
    Add-Warning 'Archived or cutover documents are context only; this workflow checks current checkout paths.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
