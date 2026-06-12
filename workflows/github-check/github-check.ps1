param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\github-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'github-check'
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

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    $workflowRoot = Join-Path (Get-Location) '.github/workflows'
    Add-Check 'github-workflows-directory' (Test-Path -LiteralPath $workflowRoot) '.github/workflows probe.'
    if (Test-Path -LiteralPath $workflowRoot) {
        $files = Get-ChildItem -LiteralPath $workflowRoot -File -Include *.yml,*.yaml -ErrorAction SilentlyContinue
        Add-Check 'workflow-file-count' (@($files).Count -gt 0) ("{0} workflow files found." -f @($files).Count)
        $candidates = @()
        foreach ($file in $files) {
            $candidates += [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
            $text = Get-Content -LiteralPath $file.FullName -Raw
            $inJobs = $false
            foreach ($line in ($text -split "`r?`n")) {
                if ($line -match '^\s*jobs:\s*$') { $inJobs = $true; continue }
                if ($inJobs -and $line -match '^[A-Za-z_][A-Za-z0-9_-]*:\s*$') { $inJobs = $false }
                if ($inJobs -and $line -match '^\s{2}([A-Za-z0-9_-]+):\s*$') { $candidates += $Matches[1] }
            }
        }
        $unique = $candidates | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique
        Add-Check 'candidate-checks' (@($unique).Count -gt 0) $(if (@($unique).Count -gt 0) { ($unique -join ', ') } else { 'No candidate checks found.' })
    } else {
        Add-Warning 'No .github/workflows directory found; required checks cannot be inferred from local workflow evidence.'
    }
    Add-Warning 'This workflow does not call GitHub APIs, save rulesets, change branch protection, or submit forms.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
