param([switch]$Help)
if ($Help) {
    Write-Host 'Usage: .\tests\validate-structure.ps1'
    exit 0
}
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$required = @(
    'README.md','LICENSE','CHANGELOG.md','distribution/agent-routines.manifest.json',
    'skills/guarded-change/SKILL.md','skills/review-loop/SKILL.md','skills/merge-fix/SKILL.md','skills/api-sync/SKILL.md','skills/dms-repair/SKILL.md','skills/pay-docs/SKILL.md','skills/env-audit/SKILL.md',
    'skills/runtime-repair/SKILL.md','skills/java-maven-verify/SKILL.md','skills/governance-audit/SKILL.md','skills/archive-record/SKILL.md','skills/node-workspace-release/SKILL.md','skills/knowledge-drift/SKILL.md',
    'workflows/preflight/preflight.ps1','workflows/preflight/preflight.sh','workflows/preflight/schema.json','workflows/preflight/examples/sample-output.json',
    'workflows/gate-check/gate-check.ps1','workflows/gate-check/gate-check.sh','workflows/gate-check/schema.json','workflows/gate-check/examples/sample-output.json',
    'workflows/merge-check/merge-check.ps1','workflows/merge-check/merge-check.sh','workflows/merge-check/schema.json','workflows/merge-check/examples/sample-output.json',
    'workflows/archive-check/archive-check.ps1','workflows/archive-check/archive-check.sh','workflows/archive-check/schema.json','workflows/archive-check/examples/sample-output.json',
    'workflows/db-read/db-read.ps1','workflows/db-read/db-read.sh','workflows/db-read/schema.json','workflows/db-read/examples/sample-output.json',
    'workflows/doc-check/doc-check.ps1','workflows/doc-check/doc-check.sh','workflows/doc-check/schema.json','workflows/doc-check/examples/sample-output.json',
    'workflows/runtime-check/runtime-check.ps1','workflows/runtime-check/runtime-check.sh','workflows/runtime-check/schema.json','workflows/runtime-check/examples/sample-output.json',
    'workflows/maven-check/maven-check.ps1','workflows/maven-check/maven-check.sh','workflows/maven-check/schema.json','workflows/maven-check/examples/sample-output.json',
    'workflows/governance-check/governance-check.ps1','workflows/governance-check/governance-check.sh','workflows/governance-check/schema.json','workflows/governance-check/examples/sample-output.json',
    'workflows/node-workspace-check/node-workspace-check.ps1','workflows/node-workspace-check/node-workspace-check.sh','workflows/node-workspace-check/schema.json','workflows/node-workspace-check/examples/sample-output.json',
    'workflows/drift-check/drift-check.ps1','workflows/drift-check/drift-check.sh','workflows/drift-check/schema.json','workflows/drift-check/examples/sample-output.json',
    'workflows/startup-check/startup-check.ps1','workflows/startup-check/startup-check.sh','workflows/startup-check/schema.json','workflows/startup-check/examples/sample-output.json',
    'adapters/common/install-manifest.ps1','adapters/common/install-manifest.sh',
    'adapters/codex/install-user.ps1','adapters/codex/install-user.sh','adapters/codex/install-project.ps1','adapters/codex/install-project.sh','adapters/codex/install-manifest.ps1','adapters/codex/install-manifest.sh','adapters/codex/uninstall-user.ps1','adapters/codex/uninstall-user.sh','adapters/codex/uninstall-project.ps1','adapters/codex/uninstall-project.sh',
    'adapters/claude-code/install-user.ps1','adapters/claude-code/install-user.sh','adapters/claude-code/install-project.ps1','adapters/claude-code/install-project.sh','adapters/claude-code/install-manifest.ps1','adapters/claude-code/install-manifest.sh','adapters/claude-code/uninstall-user.ps1','adapters/claude-code/uninstall-user.sh','adapters/claude-code/uninstall-project.ps1','adapters/claude-code/uninstall-project.sh',
    'docs/architecture.md','docs/distribution.md','docs/compatibility.md','docs/cross-platform.md','docs/naming.md','docs/security.md','docs/diagrams.md','docs/usage-manual.md','docs/skill-authoring-guide.md','docs/workflow-authoring-guide.md',
    'tests/validate-structure.ps1','tests/validate-structure.sh','tests/validate-skills.ps1','tests/validate-skills.sh','tests/validate-workflows.ps1','tests/validate-workflows.sh','tests/validate-manifest.ps1','tests/validate-manifest.sh'
)
$missing = @()
foreach ($item in $required) {
    $path = Join-Path $root $item
    if (-not (Test-Path -LiteralPath $path)) { $missing += $item }
}
if ($missing.Count -gt 0) {
    Write-Error ("Missing required paths:`n" + ($missing -join "`n"))
    exit 1
}
Write-Host "validate-structure: ok ($($required.Count) paths checked)"
