param(
    [string]$Tool = '',
    [string]$Scope = '',
    [string]$ProjectPath = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: check-install.ps1 -Tool codex|claude-code -Scope user|project [-ProjectPath <path>]'
    Write-Host 'Readonly integrity check of installed skills and workflows against the source'
    Write-Host 'repository. Reports ok, drift (content differs from source), or broken (files'
    Write-Host 'missing). Exits 1 only when at least one installed routine is broken.'
    exit 0
}

$ErrorActionPreference = 'Stop'
if (@('codex', 'claude-code') -notcontains $Tool) {
    throw 'Tool must be codex or claude-code.'
}
if (@('user', 'project') -notcontains $Scope) {
    throw 'Scope must be user or project.'
}

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$SkillSourceRoot = Join-Path $RepoRoot 'skills'
$WorkflowSourceRoot = Join-Path $RepoRoot 'workflows'
$SkillFolder = if ($Tool -eq 'codex') { '.codex\skills' } else { '.claude\skills' }
if ($Scope -eq 'user') {
    $SkillTargetRoot = Join-Path $HOME $SkillFolder
    $WorkflowTargetRoot = Join-Path $HOME '.agent-routines\workflows'
} else {
    $ProjectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path
    $SkillTargetRoot = Join-Path $ProjectRoot $SkillFolder
    $WorkflowTargetRoot = Join-Path $ProjectRoot '.agent-routines\workflows'
}

$script:checked = 0
$script:okCount = 0
$script:driftCount = 0
$script:brokenCount = 0

function Compare-InstalledDirectory {
    param([string]$Kind, [string]$Name, [string]$Source, [string]$Target)
    $script:checked++
    $missing = 0
    $differs = 0
    foreach ($file in @(Get-ChildItem -LiteralPath $Source -Recurse -File)) {
        $relative = $file.FullName.Substring($Source.Length).TrimStart('\', '/')
        $targetFile = Join-Path $Target $relative
        if (-not (Test-Path -LiteralPath $targetFile)) {
            $missing++
        } else {
            $sourceHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
            $targetHash = (Get-FileHash -LiteralPath $targetFile -Algorithm SHA256).Hash
            if ($sourceHash -ne $targetHash) { $differs++ }
        }
    }
    if ($missing -gt 0) {
        $script:brokenCount++
        Write-Host "check-install: $Kind ${Name}: broken ($missing files missing)"
    } elseif ($differs -gt 0) {
        $script:driftCount++
        Write-Host "check-install: $Kind ${Name}: drift ($differs files differ from source)"
    } else {
        $script:okCount++
        Write-Host "check-install: $Kind ${Name}: ok"
    }
}

if (Test-Path -LiteralPath $SkillTargetRoot) {
    foreach ($dir in (Get-ChildItem -LiteralPath $SkillTargetRoot -Directory)) {
        $source = Join-Path $SkillSourceRoot $dir.Name
        if (Test-Path -LiteralPath $source) {
            Compare-InstalledDirectory -Kind 'skill' -Name $dir.Name -Source $source -Target $dir.FullName
        }
    }
} else {
    Write-Host "check-install: no skills installed at $SkillTargetRoot"
}

if (Test-Path -LiteralPath $WorkflowTargetRoot) {
    foreach ($dir in (Get-ChildItem -LiteralPath $WorkflowTargetRoot -Directory)) {
        $source = Join-Path $WorkflowSourceRoot $dir.Name
        if (Test-Path -LiteralPath $source) {
            Compare-InstalledDirectory -Kind 'workflow' -Name $dir.Name -Source $source -Target $dir.FullName
        }
    }
} else {
    Write-Host "check-install: no workflows installed at $WorkflowTargetRoot"
}

Write-Host "check-install summary: $($script:checked) checked, $($script:okCount) ok, $($script:driftCount) drifted, $($script:brokenCount) broken"
if ($script:brokenCount -gt 0) { exit 1 }
exit 0
