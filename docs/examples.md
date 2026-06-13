# Routine Examples

These examples show how to invoke Skills in natural language and how to run workflows directly from the source repository. Skills are not command-line programs; use them as agent routing and judgment instructions.

## Skill Prompt Examples

| Skill | Example prompt |
|---|---|
| `api-sync` | "Use `api-sync` to compare the backend DTO changes and update frontend wrappers, types, enums, and affected UI with minimal validation." |
| `archive-record` | "Use `archive-record` to create a durable execution record with evidence and artifacts, then validate the archive layout." |
| `commit-guard` | "Use `commit-guard` to validate the current changes, stage only the intended scope, create a local commit if clean, and do not push." |
| `desktop-design-system` | "Use `desktop-design-system` to review the Electron install matrix UI for modern desktop productivity style, theme tokens, and readable status markers." |
| `desktop-packaging-release` | "Use `desktop-packaging-release` to check Electron packaging readiness across Windows, macOS, and Linux without signing or publishing." |
| `desktop-qa` | "Use `desktop-qa` to verify the Electron app in light, dark, and system themes with screenshots and platform notes." |
| `dms-repair` | "Use `dms-repair` to confirm the current database state with readonly SQL, prepare minimal SQL for human DMS execution, and plan readonly post-checks." |
| `electron-app-builder` | "Use `electron-app-builder` to implement the Electron command runner with secure IPC, allowlisted commands, theme switching, and i18n state." |
| `env-audit` | "Use `env-audit` to diagnose this Windows and shell toolchain problem without installing or changing anything." |
| `github-guard` | "Use `github-guard` to draft branch protection and required checks from local GitHub workflow evidence without saving remote settings." |
| `governance-audit` | "Use `governance-audit` to audit current repository governance from live files and command output, excluding archived plans as proof." |
| `graph-audit` | "Use `graph-audit` to check whether graph-first discovery is available for this repo and state the fallback if it is not indexed." |
| `guarded-change` | "Use `guarded-change` to make the smallest safe repository change after reading local rules and running relevant gates." |
| `i18n-checklist` | "Use `i18n-checklist` to verify Simplified Chinese and English translation keys, status labels, and language switching." |
| `java-maven-verify` | "Use `java-maven-verify` to build the narrowest Maven test command for this module and handle PowerShell quoting correctly." |
| `knowledge-drift` | "Use `knowledge-drift` to check whether these Markdown knowledge files still match current source paths and policies." |
| `merge-fix` | "Use `merge-fix` to resolve current merge conflicts, preserve intended behavior from both sides, and run path-limited validation." |
| `node-workspace-release` | "Use `node-workspace-release` to inspect this pnpm workspace release surface with dry-run checks before publishing." |
| `pay-docs` | "Use `pay-docs` to write Chinese-first payment configuration documentation backed by source code and risk notes." |
| `prompt-qa` | "Use `prompt-qa` to review and repair this prompt until no new prompt issues remain; do not execute the workflow it describes." |
| `release-guard` | "Use `release-guard` to assess public release readiness, package metadata, docs, security checks, and dry-run evidence without publishing." |
| `review-loop` | "Use `review-loop` to review current branch changes, fix actionable issues, run gates, and re-review until clean." |
| `runtime-repair` | "Use `runtime-repair` to diagnose this agent runtime hook or PATH failure and propose the smallest repair before making changes." |
| `security-review` | "Use `security-review` to scan for public-release leakage without printing secret values or deleting files." |

## Workflow Command Examples

| Workflow | PowerShell | Bash |
|---|---|---|
| `archive-check` | `.\workflows\archive-check\archive-check.ps1 -Path .` | `./workflows/archive-check/archive-check.sh --path .` |
| `commit-check` | `.\workflows\commit-check\commit-check.ps1 -Path .` | `./workflows/commit-check/commit-check.sh --path .` |
| `db-read` | `.\workflows\db-read\db-read.ps1 -Path .` | `./workflows/db-read/db-read.sh --path .` |
| `doc-check` | `.\workflows\doc-check\doc-check.ps1 -Path .` | `./workflows/doc-check/doc-check.sh --path .` |
| `drift-check` | `.\workflows\drift-check\drift-check.ps1 -Path .` | `./workflows/drift-check/drift-check.sh --path .` |
| `gate-check` | `.\workflows\gate-check\gate-check.ps1 -Path .` | `./workflows/gate-check/gate-check.sh --path .` |
| `github-check` | `.\workflows\github-check\github-check.ps1 -Path .` | `./workflows/github-check/github-check.sh --path .` |
| `governance-check` | `.\workflows\governance-check\governance-check.ps1 -Path .` | `./workflows/governance-check/governance-check.sh --path .` |
| `graph-check` | `.\workflows\graph-check\graph-check.ps1 -Path .` | `./workflows/graph-check/graph-check.sh --path .` |
| `maven-check` | `.\workflows\maven-check\maven-check.ps1 -Path .` | `./workflows/maven-check/maven-check.sh --path .` |
| `merge-check` | `.\workflows\merge-check\merge-check.ps1 -Path .` | `./workflows/merge-check/merge-check.sh --path .` |
| `node-workspace-check` | `.\workflows\node-workspace-check\node-workspace-check.ps1 -Path .` | `./workflows/node-workspace-check/node-workspace-check.sh --path .` |
| `preflight` | `.\workflows\preflight\preflight.ps1 -Path .` | `./workflows/preflight/preflight.sh --path .` |
| `release-check` | `.\workflows\release-check\release-check.ps1 -Path .` | `./workflows/release-check/release-check.sh --path .` |
| `runtime-check` | `.\workflows\runtime-check\runtime-check.ps1 -Path .` | `./workflows/runtime-check/runtime-check.sh --path .` |
| `security-check` | `.\workflows\security-check\security-check.ps1 -Path .` | `./workflows/security-check/security-check.sh --path .` |
| `startup-check` | `.\workflows\startup-check\startup-check.ps1 -Path .` | `./workflows/startup-check/startup-check.sh --path .` |
