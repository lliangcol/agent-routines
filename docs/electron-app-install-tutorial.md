# Electron App Installation Tutorial

This document explains how to review and install Agent Routines with the Agent Routines Manager Electron App. It uses `D:\Repositories` as a controlled example scope and includes a specialized set for `D:\Repositories\agent-routines`. Actual Apply decisions must come from the current v2 config, generated manifest, and action table.

This is a controlled installation workflow. Without explicit human confirmation, do not run `Apply`, `replace-listed`, or `sync-prune`, and do not modify user-level or project-level installation targets.

## Example Review Summary

Execution context:

| Item | Value |
| --- | --- |
| Source repository | `D:\Repositories\agent-routines` |
| Project root | `D:\Repositories` |
| Discovered projects | `D:\Repositories\agent-config`, `D:\Repositories\agent-dive`, `D:\Repositories\agent-routines`, `D:\Repositories\computer-use` |
| Source inventory | 24 Skills, 17 workflows |
| Execution mode | PowerShell readonly config validation and dry-run plan |
| Write state | No manifest written, no Apply run |

Equivalent commands that were run:

```powershell
.\tests\validate-install-discovery-config.ps1 -ConfigPath $env:TEMP\agent-routines.d-repositories.install-discovery.config.json
.\tools\generate-install-manifest.ps1 -ConfigPath $env:TEMP\agent-routines.d-repositories.install-discovery.config.json
```

Result summary:

| Check | Result |
| --- | --- |
| Config validation | `validate-install-discovery-config: ok` |
| discoveredProjects | Generated from `discovery.roots` and `maxDepth`. |
| desiredTargets | User targets, project defaults, and explicit `projectTargets[]`. |
| actions | `install`, `skip`, `replace`, or `prune-candidate`. |
| unknownInstalledItems | Source-external items; report-only. |
| unclassifiedInstalledItems | Installed items without a known routine source; report-only. |
| backupPlan / restorePlan | Required before `replace-listed` or `sync-prune`. |

Unknown and unclassified installed items are always report-only. The discovery tool does not delete, migrate, or add them to the manifest unless a reviewed v2 desired target explicitly names the routine.

Project creation is controlled by `projectDefaults.createTargets` and each `projectTargets[].createTargets`. When `createTargets` is `false`, the planner reports missing project target roots instead of creating them. When it is `true`, generated actions still require review before Apply.

## Electron App Flow

1. Start the app.

   Development mode:

   ```powershell
   Set-Location D:\Repositories\agent-routines\apps\agent-routines-manager
   npm run dev
   ```

   For a packaged build, open Agent Routines Manager directly.

2. In Settings, confirm:

   | Field | Value |
   | --- | --- |
   | Source repository | `D:\Repositories\agent-routines` |
   | Active config | Recommended: `.tmp\install-discovery.d-repositories.json` |

   Avoid saving local machine config under `tools\` and committing it. `.tmp\` is ignored by this repository and is appropriate for local reviewed config.

3. In Projects, configure:

   | Field | Value |
   | --- | --- |
   | Root path | `D:\Repositories` |
   | Depth | `4` |
   | Nested repos | `skip` |
   | Excluded directories | `.git`, `node_modules`, `vendor`, `dist`, `build`, `target`, `.tmp`, `.cache`, `tmp`, `temp`, `.agent-routines`, `.codex`, `.claude` |

   Remove `D:\Work\Projects` for this scoped run.

4. In Policy, set the user-level and project-level policy shown below.

5. Click Save config as and save to:

   ```text
   .tmp\install-discovery.d-repositories.json
   ```

6. Click Validate config.

   Expected result: `config valid`. If duplicate or missing source errors appear, fix the routine names in Policy first.

7. Open Distribute and review Choose Scope, Select Routines, Review Targets, Apply Mode, Run & Verify, and Result.

8. Click Generate dry-run plan.

   This only runs discovery. It does not write files.

9. Review Plan JSON.

   Plan JSON is readonly. If the desired state is wrong, edit and save the config, then regenerate the plan.

10. Only after human approval, click Write manifest.

11. Only after human approval to install, type:

   ```text
   APPLY
   ```

   Then click Apply.

12. Only after reviewing replacement risk, choose `replace-listed` and type:

   ```text
   REPLACE <N> TARGETS
   ```

   Replacement backs up targets first. For synchronized deletion, choose `sync-prune` and type `SYNC PRUNE <N> TARGETS`.

## Recommended Config

The config saved through the Electron App should be equivalent to:

```json
{
  "version": 2,
  "userTargets": {
    "enabled": true,
    "tools": ["codex", "claudeCode"],
    "skills": {
      "codex": ["guarded-change", "review-loop"],
      "claudeCode": ["guarded-change", "review-loop"]
    },
    "workflows": ["preflight", "gate-check"]
  },
  "projectDefaults": {
    "enabled": true,
    "tools": ["codex", "claudeCode"],
    "skills": { "codex": [], "claudeCode": [] },
    "workflows": ["preflight", "gate-check"],
    "createTargets": false,
    "mode": "merge"
  },
  "projectTargets": [
    {
      "path": "D:\\Repositories\\agent-routines",
      "enabled": true,
      "tools": ["codex", "claudeCode"],
      "skills": {
        "codex": ["electron-app-builder"],
        "claudeCode": ["electron-app-builder"]
      },
      "workflows": ["preflight", "gate-check"],
      "createTargets": false,
      "mode": "merge"
    }
  ],
  "discovery": {
    "roots": ["D:\\Repositories"],
    "maxDepth": 4,
    "excludeDirs": [".git", "node_modules", ".agent-routines", ".codex", ".claude"],
    "skipNestedRepos": true
  },
  "promotionRules": {
    "doNotPromoteToUserSkills": ["pay-docs", "dms-repair", "api-sync"]
  },
  "output": {
    "manifestPath": ".tmp/generated/d-repositories.install.manifest.json",
    "reportPath": ".tmp/generated/d-repositories.install.plan.json"
  },
  "applySafety": {
    "unknownInstalledItems": "report-only"
  }
}
```

## User-Level Installation Set

User-level Skills go to the Codex and Claude Code user-level Skill targets. The workflow runtime is shared and only needs to be carried once by the primary workflow tool section in the generated manifest.

### User-Level Skills

| Skill | Why user-level |
| --- | --- |
| `guarded-change` | All repositories need safe change boundaries, confirmation points, and rollback rules. |
| `review-loop` | Reusable review, fix, and re-review loop across repositories. |
| `merge-fix` | Generic conflict handling for Git repositories. |
| `env-audit` | Machine shell, PATH, runtime, and agent environment checks are cross-repository. |
| `runtime-repair` | Runtime gaps are usually machine-level or user-level problems. |
| `commit-guard` | Commit readiness, identity, diff, and branch checks apply across repositories. |
| `prompt-qa` | Useful for AGENTS, CLAUDE, task prompts, and execution contracts. |
| `release-guard` | Release risk identification is reusable across repositories. |
| `security-review` | Secrets, private paths, and sensitive output risks apply everywhere. |
| `github-guard` | GitHub Actions, PR, and branch-protection review is cross-repository. |
| `graph-audit` | Reusable when a repository has codebase-memory or graph-first instructions; otherwise it degrades to evidence-backed reporting. |

### User-Level Workflows

| Workflow | Purpose |
| --- | --- |
| `preflight` | Collect repository path, branch, HEAD, dirty state, and rule-file signals. |
| `gate-check` | Run common readonly gates and explicitly safe custom commands. |
| `merge-check` | Check merge state, unresolved files, and conflict markers. |
| `runtime-check` | Check shell, PATH, runtime, and agent runtime readiness. |
| `commit-check` | Check commit readiness, diff whitespace, staged files, and untracked files. |
| `release-check` | Check release readiness without publishing, tagging, or pushing. |
| `security-check` | Local high-confidence secret-like and private-path signal scan. |
| `github-check` | Inspect local GitHub Actions workflow files and candidate required checks. |
| `graph-check` | Check graph and MCP readiness locally without registering MCP or indexing repositories. |

Source Skills intentionally kept out of user-level:

| Skill | Reason |
| --- | --- |
| `pay-docs` | Only fits payment, subscription, and configuration documentation tasks. |
| `dms-repair` | Database repair must remain strongly tied to a project and environment. |
| `api-sync` | API, DTO, and enum sync must bind to a concrete repository contract. |
| `node-workspace-release` | Node workspace release work must bind to package-manager, lockfile, and release surface. |
| `electron-app-builder`, `desktop-*`, `i18n-checklist` | Needed only for Electron desktop app repositories. |
| `archive-record`, `knowledge-drift`, `governance-audit` | Reusable, but better as project-specialized capability rather than default user-level behavior. |
| `java-maven-verify`, `db-read`, `maven-check`, `startup-check` related capability | The reviewed `D:\Repositories` snapshot does not show shared Java Maven, database repair, or Windows startup project needs. |

## D:\Repositories Review Snapshot

| Project | Current evidence | Minimal project-level set | Optional specialized set |
| --- | --- | --- | --- |
| `agent-config` | Python `pyproject.toml`; AGENTS requires audit-only behavior and forbids real install, login, plugin install, and MCP registration by default. | Project Skills: none. Project workflows: `preflight`, `gate-check`, `governance-check`. | For release or public-readiness work, use user-level `release-guard`, `security-review`; optionally add project workflows `security-check`, `release-check`. |
| `agent-dive` | Chinese documentation and learning repository; AGENTS requires Chinese output, real evidence, and codebase-memory first. | Project Skills: none. Project workflows: `preflight`, `gate-check`, `governance-check`. | For frequent knowledge maintenance, add `knowledge-drift`, `doc-check`, `drift-check`, `graph-check`. |
| `agent-routines` | Agent Routines source repository with Skills, workflows, adapters, Electron App, bilingual docs, and validation gates. | Project Skills: none. Project workflows: `preflight`, `gate-check`, `governance-check`. v2 project defaults can express this set. | See the specialized project set below. |
| `computer-use` | Local computer-control execution records, runbooks, and evidence; README requires archive validation. | Project Skills: none. Project workflows: `preflight`, `gate-check`, `governance-check`. | For archive maintenance, add `archive-record`, `archive-check`; use `startup-check` only for Windows startup records. |

## Minimal D:\Repositories Installation Set

Minimum-set rules:

1. Put cross-repository judgment capabilities at user level.
2. Put only universally useful, domain-neutral workflow runtime at project level.
3. Do not install payment, database, Maven, Electron, or Node release capabilities into every project.

Minimum set:

| Scope | Skills | Workflows |
| --- | --- | --- |
| User Codex | `guarded-change`, `review-loop`, `merge-fix`, `env-audit`, `runtime-repair`, `commit-guard`, `prompt-qa`, `release-guard`, `security-review`, `github-guard`, `graph-audit` | `preflight`, `gate-check`, `merge-check`, `runtime-check`, `commit-check`, `release-check`, `security-check`, `github-check`, `graph-check` |
| User Claude Code | Same as User Codex Skills | Not duplicated; shared workflow runtime is carried once |
| Project defaults for reviewed roots | No project-level Skills | `preflight`, `gate-check`, `governance-check` |

Project defaults apply only to desired project targets in the reviewed v2 config. To target a specific repository, add it to `projectTargets[]` or use the Projects page "Keep only this project" action. `createTargets: false` keeps the plan report-only for missing project target roots; `createTargets: true` may create those roots after review.

## agent-routines Specialized Installation Set

### Selected Project Override

For long-term maintenance of `agent-routines` as both the routines source repository and the Electron App repository, express the specialized target as a `projectTargets[]` override for `D:\Repositories\agent-routines`. Do not hand-edit Plan JSON; the saved v2 config and generated manifest are the source for Write manifest and Apply.

Project-level Skills:

| Skill | Reason |
| --- | --- |
| `electron-app-builder` | Electron main/preload/renderer, IPC allowlist, and command execution boundaries. |
| `desktop-design-system` | Desktop operator-console visual and interaction rules. |
| `desktop-qa` | Electron UI, native window behavior, task logs, screenshots, and platform QA. |
| `desktop-packaging-release` | Electron Builder, signing boundaries, directory packaging, and release risk. |
| `i18n-checklist` | English and Simplified Chinese UI, translation keys, text length, and language switching. |
| `api-sync` | main/preload/renderer API, DTO, schema, and enum sync. |
| `node-workspace-release` | `apps/agent-routines-manager` npm workspace, lockfile, and release dry-runs. |
| `archive-record` | `executions/YYYY/MM/...` archive, evidence, and artifact layout. |
| `knowledge-drift` | Drift checks between docs, catalog, examples, execution records, and source directories. |
| `governance-audit` | AGENTS, validation gates, installation policy, and current-evidence authority audit. |

Project-level workflows:

| Workflow | Reason |
| --- | --- |
| `preflight` | Repository-state evidence before every specialized task. |
| `gate-check` | Safe custom gates and diff checks. |
| `governance-check` | Current governance files, agent directories, validation scripts, and git state. |
| `node-workspace-check` | Electron App package metadata, lockfile, and npm scripts. |
| `runtime-check` | PowerShell, Bash, Python, Node, npm, and agent runtime readiness. |
| `security-check` | Local IPC, release, docs, and path-risk scanning. |
| `release-check` | Changelog, license, security notes, and release tooling. |
| `doc-check` | Bilingual docs, catalog, examples, and custom doc checks. |
| `archive-check` | Durable execution archive layout validation. |
| `drift-check` | Knowledge roots, drift metadata, and local drift-tool availability. |
| `github-check` | GitHub Actions workflow and required-check candidates. |
| `graph-check` | codebase-memory MCP readiness and graph-first instruction checks. |
| `commit-check` | Pre-commit branch, identity, diff whitespace, and staged state. |
| `merge-check` | Merge state and conflict marker checks. |

Do not hand-edit Plan JSON to add project-specific items. In the current app the Plan JSON view is readonly; the saved config and generated manifest are the source for Write manifest and Apply.

## Pre-Apply Checklist

Before clicking Apply in the Electron App, confirm:

| Check | Passing standard |
| --- | --- |
| Source repository | `D:\Repositories\agent-routines`. |
| Active config | Reviewed `.tmp\install-discovery.d-repositories.json`. |
| Projects root | Only `D:\Repositories`; no unintended roots. |
| Policy | User defaults, project defaults, and project overrides match the reviewed v2 config. |
| Dry-run plan | The action table has only reviewed `install`, `skip`, `replace`, or `prune-candidate` entries. |
| Unknown installed items | Source-external or unclassified installs remain report-only and are not applied. |
| Generated projects | Project targets match the reviewed `projectTargets[]` and discovered projects. |
| Confirmation | `merge` uses `APPLY`; `replace-listed` uses `REPLACE <N> TARGETS`; `sync-prune` uses `SYNC PRUNE <N> TARGETS`. |

## Post-Install Verification

After Apply succeeds, run these from the Electron App:

1. Install Matrix -> Refresh scan.
2. Distribute or Task Center -> Check install target.
3. Validation -> Run all readonly.

Equivalent commands:

```powershell
.\adapters\codex\check-user.ps1
.\adapters\claude-code\check-user.ps1
.\adapters\codex\check-project.ps1 -ProjectPath D:\Repositories\agent-routines
.\adapters\claude-code\check-project.ps1 -ProjectPath D:\Repositories\agent-routines
```

Repository gates:

```powershell
.\tests\validate-structure.ps1
.\tests\validate-skills.ps1
.\tests\validate-workflows.ps1
.\tests\validate-docs.ps1
.\tests\validate-changelog.ps1
.\tests\validate-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\tools\install-discovery.config.example.json
.\tests\run-workflows.ps1
```

If Bash is available, also run the matching `.sh` gates. PowerShell and Bash must both pass before the installation workflow is considered complete.
