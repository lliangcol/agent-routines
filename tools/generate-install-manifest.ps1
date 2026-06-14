param(
    [string]$ConfigPath = '',
    [switch]$WriteManifest,
    [switch]$Apply,
    [switch]$Force,
    [ValidateSet('dry-run','merge','replace-listed','sync-prune')]
    [string]$ApplyMode = 'merge',
    [string]$ExpectedManifestDigest = '',
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: .\tools\generate-install-manifest.ps1 -ConfigPath <path> [-WriteManifest] [-Apply] [-Force] [-ApplyMode merge|replace-listed|sync-prune|dry-run] [-ExpectedManifestDigest <sha256>]'
    Write-Host 'Discovers installed Agent Routines targets, generates a manifest plan, and optionally installs it.'
    Write-Host 'Default mode is dry-run: no files are written and no install is executed.'
    exit 0
}

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
$OutputEncoding = [Console]::OutputEncoding
if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    throw 'ConfigPath is required. Use -ConfigPath <path>.'
}
if ($Apply -and -not $WriteManifest) {
    throw 'Apply requires WriteManifest so the reviewed manifest path exists before installation.'
}

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$ConfigFile = (Resolve-Path -LiteralPath $ConfigPath).Path
$SkillSourceRoot = Join-Path $RepoRoot 'skills'
$WorkflowSourceRoot = Join-Path $RepoRoot 'workflows'

$python = $null
foreach ($candidate in @('python3','python')) {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($null -ne $command) {
        $python = $command.Source
        break
    }
}
if ([string]::IsNullOrWhiteSpace($python)) {
    throw 'generate-install-manifest.ps1 requires python3 or python.'
}

$helper = Join-Path $PSScriptRoot 'install-discovery-plan.py'
$helperArgs = @('--repo-root', $RepoRoot, '--config-path', $ConfigFile, '--mode', $ApplyMode)
if ($WriteManifest) { $helperArgs += '--write-manifest' }
if ($Apply) { $helperArgs += '--apply' }
if ($Force) { $helperArgs += '--force' }
if (-not [string]::IsNullOrWhiteSpace($ExpectedManifestDigest)) { $helperArgs += @('--expected-manifest-digest', $ExpectedManifestDigest) }

$planJson = (& $python $helper @helperArgs) -join "`n"
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
Write-Output $planJson
$plan = $planJson | ConvertFrom-Json
$manifestPath = $plan.installPlan.manifestPath
$tools = @($plan.installPlan.tools)
$mode = [string]$plan.installPlan.applyMode

if ($WriteManifest) {
    & (Join-Path $RepoRoot 'tests\validate-manifest.ps1') -ManifestPath $manifestPath
}

if ($Apply) {
    foreach ($tool in $tools) {
        $adapterTool = if ($tool -eq 'claudeCode') { 'claude-code' } else { 'codex' }
        $adapter = Join-Path $RepoRoot ("adapters\$adapterTool\install-manifest.ps1")
        & $adapter -ManifestPath $manifestPath -Mode $mode -Force:$Force
    }
    if ($plan.installPlan.verifyAfterInstall) {
        foreach ($tool in $tools) {
            $checkAdapter = if ($tool -eq 'claudeCode') { 'claude-code' } else { 'codex' }
            & (Join-Path $RepoRoot ("adapters\$checkAdapter\check-user.ps1"))
        }
        foreach ($project in $plan.discoveredProjects) {
            foreach ($tool in $tools) {
                $checkAdapter = if ($tool -eq 'claudeCode') { 'claude-code' } else { 'codex' }
                & (Join-Path $RepoRoot ("adapters\$checkAdapter\check-project.ps1")) -ProjectPath $project.path
            }
        }
    }
}
exit 0
