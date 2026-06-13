# Claude Code Adapter

This adapter installs or uninstalls Agent Routines Skills and workflow runtime files for Claude Code.

## User-Level Install

```powershell
.\install-user.ps1 [-SkillName guarded-change] [-SkipWorkflows] [-WorkflowsOnly] [-Force] [-WhatIf]
```

```bash
./install-user.sh [--skill-name guarded-change] [--skip-workflows] [--workflows-only] [--force] [--dry-run]
```

## Project-Level Install

```powershell
.\install-project.ps1 -ProjectPath <repo> [-SkillName guarded-change] [-SkipWorkflows] [-WorkflowsOnly] [-Force] [-WhatIf]
```

```bash
./install-project.sh --project-path <repo> [--skill-name guarded-change] [--skip-workflows] [--workflows-only] [--force] [--dry-run]
```

## Manifest Install

```powershell
.\install-manifest.ps1 -ManifestPath <path> [-Force] [-WhatIf]
```

```bash
./install-manifest.sh --manifest-path PATH [--force] [--dry-run]
```

Manifest mode reads user-level and project-level targets from one JSON file. It copies only the listed Skill and workflow folders and does not delete installed content that is absent from the manifest.

Use `-WhatIf` or `--dry-run` before broad installation to print the targets that would be installed, replaced, or skipped. Dry-run mode does not create directories, copy files, remove files, or replace existing targets.

## Self-Check

```powershell
.\check-user.ps1
.\check-project.ps1 -ProjectPath <repo>
```

```bash
./check-user.sh
./check-project.sh --project-path <repo>
```

Readonly integrity check of installed Skills and workflows against the source repository. Reports `ok`, `drift` (content differs from source), or `broken` (files missing); exits nonzero only on `broken`.

## Target

Skills go to `~/.claude/skills` or `.claude/skills`. Workflows go to .agent-routines/workflows in the selected user or project scope.
