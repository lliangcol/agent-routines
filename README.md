# Agent Routines

[![CI](https://github.com/lliangcol/agent-routines/actions/workflows/ci.yml/badge.svg)](https://github.com/lliangcol/agent-routines/actions/workflows/ci.yml)

Chinese description: 可分发的 AI Agent 日常流程、Skills 和自动化脚本库。

Agent Routines is a versioned, GitHub-ready source repository for reusable AI Agent Skills, deterministic workflows, installation adapters, manuals, validation scripts, and Mermaid diagrams. The source repository is the maintenance source of truth. Codex and Claude Code user or project directories are installation targets only.

## Layering Model

- Skills handle judgment, orchestration, risk boundaries, human confirmation points, and failure routing.
- Workflows handle deterministic, repeatable, testable script execution.
- Adapters copy Skills and workflows into tool-specific user-level or project-level locations.
- Documentation records compatibility, security boundaries, naming, distribution, and authoring rules.

## Quick Start

From the source repository root:

```powershell
.\tests\validate-structure.ps1
.\tests\validate-skills.ps1
.\tests\validate-workflows.ps1
.\tests\validate-docs.ps1
.\tests\validate-changelog.ps1
.\tests\validate-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
.\tests\run-workflows.ps1
```

```bash
./tests/validate-structure.sh
./tests/validate-skills.sh
./tests/validate-workflows.sh
./tests/validate-docs.sh
./tests/validate-changelog.sh
./tests/validate-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
./tests/run-workflows.sh
```

`validate-docs` checks bilingual documentation pairing and catalog consistency. `validate-changelog` checks that CHANGELOG versions and `vX.Y.Z` git tags stay consistent. `run-workflows` executes every workflow against a temporary fixture repository, validates the JSON output contract, and asserts sh-vs-ps1 parity whenever the counterpart shell is available. The same gates run in CI on Ubuntu, macOS, and Windows (PowerShell 7 and Windows PowerShell 5.1), plus a gitleaks secret scan.

## Codex User-Level Installation

```powershell
.\adapters\codex\install-user.ps1
```

```bash
./adapters/codex/install-user.sh
```

## Claude Code User-Level Installation

```powershell
.\adapters\claude-code\install-user.ps1
```

```bash
./adapters/claude-code/install-user.sh
```

## Project-Level Installation

```powershell
.\adapters\codex\install-project.ps1 -ProjectPath C:\path\to\repo
.\adapters\claude-code\install-project.ps1 -ProjectPath C:\path\to\repo
```

```bash
./adapters/codex/install-project.sh --project-path /path/to/repo
./adapters/claude-code/install-project.sh --project-path /path/to/repo
```

## Workflow Runtime Installation

Installers copy workflows by default into:

- User runtime: `~/.agent-routines/workflows`
- Project runtime: `.agent-routines/workflows`

Use `-SkipWorkflows` or `--skip-workflows` for Skills only. Use `-WorkflowsOnly` or `--workflows-only` for workflows only.

## Manifest Installation

Use a JSON manifest when you need one reviewed source of truth for which Skills and workflows go to user-level and project-level targets.

```powershell
.\adapters\codex\install-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
.\adapters\claude-code\install-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
```

```bash
./adapters/codex/install-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
./adapters/claude-code/install-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
```

Manifest mode copies only the listed Skill and workflow folders. It does not remove installed content that is absent from the manifest. Use `-Force` or `--force` to replace listed targets that already exist.

## Installation Self-Check

After installing, verify the integrity of installed Skills and workflows against the source repository. The check is readonly: it reports `ok`, `drift` (content differs from source, usually an older version), or `broken` (files missing), and exits nonzero only on `broken`.

```powershell
.\adapters\claude-code\check-user.ps1
.\adapters\claude-code\check-project.ps1 -ProjectPath C:\path\to\repo
.\adapters\codex\check-user.ps1
```

```bash
./adapters/claude-code/check-user.sh
./adapters/claude-code/check-project.sh --project-path /path/to/repo
./adapters/codex/check-user.sh
```

## Included Routines

The repository includes Skills for guarded changes, validated commits, prompt QA, review loops, merge fixes, API sync, DMS repair, payment docs, environment audits, runtime repair, Maven verification, governance audits, archive records, Node workspace releases, public release readiness, security review, GitHub policy planning, graph audits, and knowledge drift checks.

The workflow runtime includes readonly checks for preflight state, gates, commits, releases, security findings, GitHub workflow evidence, graph readiness, merges, archives, database SQL shape, docs, runtime setup, Maven setup, governance state, Node workspaces, knowledge drift, and Windows startup sources.

## Directory Structure

- `skills/`: tool-neutral Skill folders with `SKILL.md`, README, and references.
- `workflows/`: deterministic workflow scripts, schemas, and sample outputs.
- `adapters/`: Codex and Claude Code installers and uninstallers.
- `distribution/`: manifest examples for reviewed user-level and project-level distribution.
- `docs/`: architecture, distribution, compatibility, security, diagrams, authoring manuals, and the release process.
- `tests/`: structure, Skill, workflow, docs, and manifest validators plus workflow smoke tests, for PowerShell and Bash.
- `executions/`: durable evidence packs for significant operations, following the archive-record layout.

## Contributing and Governance

- `AGENTS.md`: hard rules and validation gates for AI agents working in this repository.
- `CONTRIBUTING.md`: checklists for adding Skills and workflows, and the required gates before any commit.
- `docs/release-process.md`: versioning policy and release steps (`docs/release-process.zh-CN.md` for Chinese).

## Security Boundaries

Scripts must not default to destructive operations. Database writes, production configuration, commit/push, deletes, external publishing, and DMS execution require human confirmation. Review Skills before installation, especially when installing into user-level directories shared by multiple projects.

## Cross-Platform Support Summary

Supported targets are Windows 10/11 with Windows PowerShell 5.1 and PowerShell 7+, macOS with Bash and PowerShell 7+, and Linux with Bash and PowerShell 7+. Markdown Skills are cross-platform. OS-specific behavior appears as guarded profiles, documented fallback paths, or adapter-specific logic.
