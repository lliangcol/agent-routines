param(
    [string]$ProjectPath = '',
    [string]$SkillName = '',
    [switch]$SkipWorkflows,
    [switch]$WorkflowsOnly,
    [switch]$Force,
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: install script -ProjectPath <repo> [-SkillName <name>] [-SkipWorkflows] [-WorkflowsOnly] [-Force]'
    exit 0
}

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    throw 'ProjectPath is required. Use -ProjectPath <repo>.'
}
if ($WorkflowsOnly -and $SkipWorkflows) {
    throw 'Use either -WorkflowsOnly or -SkipWorkflows, not both.'
}
if (-not [string]::IsNullOrWhiteSpace($SkillName) -and $SkillName -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
    throw 'SkillName must be a kebab-case folder name.'
}
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path
$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$SkillSourceRoot = Join-Path $RepoRoot 'skills'
$WorkflowSourceRoot = Join-Path $RepoRoot 'workflows'
$SkillTargetRoot = Join-Path $ProjectRoot '.claude\skills'
$WorkflowTargetRoot = Join-Path $ProjectRoot '.agent-routines\workflows'
$installed = @()
$skipped = @()

function Copy-DirectorySafe {
    param([string]$Source, [string]$Target)
    if (-not (Test-Path -LiteralPath $Source)) { throw "Source not found: $Source" }
    if (Test-Path -LiteralPath $Target) {
        if (-not $Force) {
            $script:skipped += "exists:$Target"
            return
        }
        Remove-Item -LiteralPath $Target -Recurse -Force
    }
    $parent = Split-Path -Parent $Target
    if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Copy-Item -LiteralPath $Source -Destination $Target -Recurse
    $script:installed += $Target
}

if (-not $WorkflowsOnly) {
    $skillDirs = if ($SkillName) { @(Join-Path $SkillSourceRoot $SkillName) } else { @(Get-ChildItem -LiteralPath $SkillSourceRoot -Directory | Select-Object -ExpandProperty FullName) }
    foreach ($source in $skillDirs) {
        Copy-DirectorySafe -Source $source -Target (Join-Path $SkillTargetRoot (Split-Path -Leaf $source))
    }
}

if (-not $SkipWorkflows) {
    Copy-DirectorySafe -Source $WorkflowSourceRoot -Target $WorkflowTargetRoot
}

Write-Host 'Install summary'
Write-Host ('Installed: ' + (($installed -join '; ')))
Write-Host ('Skipped: ' + (($skipped -join '; ')))
