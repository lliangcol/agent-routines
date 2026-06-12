param(
    [string]$ProjectPath = '',
    [string]$SkillName = '',
    [switch]$WorkflowsOnly,
    [switch]$RemoveWorkflows,
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: uninstall script -ProjectPath <repo> -SkillName <name> [-RemoveWorkflows] or -WorkflowsOnly'
    exit 0
}

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    throw 'ProjectPath is required. Use -ProjectPath <repo>.'
}
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path
$SkillTargetRoot = Join-Path $ProjectRoot '.codex\skills'
$WorkflowTargetRoot = Join-Path $ProjectRoot '.agent-routines\workflows'
$removed = @()
$skipped = @()

if (-not $WorkflowsOnly -and [string]::IsNullOrWhiteSpace($SkillName)) {
    throw 'SkillName is required unless -WorkflowsOnly is used.'
}
if (-not $WorkflowsOnly -and $SkillName -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
    throw 'SkillName must be a kebab-case folder name.'
}

if (-not $WorkflowsOnly) {
    $skillTarget = Join-Path $SkillTargetRoot $SkillName
    if (Test-Path -LiteralPath $skillTarget) {
        Remove-Item -LiteralPath $skillTarget -Recurse -Force
        $removed += $skillTarget
    } else {
        $skipped += "missing:$skillTarget"
    }
}

if ($WorkflowsOnly -or $RemoveWorkflows) {
    if (Test-Path -LiteralPath $WorkflowTargetRoot) {
        Remove-Item -LiteralPath $WorkflowTargetRoot -Recurse -Force
        $removed += $WorkflowTargetRoot
    } else {
        $skipped += "missing:$WorkflowTargetRoot"
    }
}

Write-Host 'Uninstall summary'
Write-Host ('Removed: ' + (($removed -join '; ')))
Write-Host ('Skipped: ' + (($skipped -join '; ')))
