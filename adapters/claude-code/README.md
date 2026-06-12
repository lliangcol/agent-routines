# Claude Code Adapter

This adapter installs or uninstalls Agent Routines Skills and workflow runtime files for Claude Code.

## User-Level Install

```powershell
.\install-user.ps1 [-SkillName guarded-change] [-SkipWorkflows] [-WorkflowsOnly] [-Force]
```

```bash
./install-user.sh [--skill-name guarded-change] [--skip-workflows] [--workflows-only] [--force]
```

## Project-Level Install

```powershell
.\install-project.ps1 -ProjectPath <repo> [-SkillName guarded-change] [-SkipWorkflows] [-WorkflowsOnly] [-Force]
```

```bash
./install-project.sh --project-path <repo> [--skill-name guarded-change] [--skip-workflows] [--workflows-only] [--force]
```

## Manifest Install

```powershell
.\install-manifest.ps1 -ManifestPath <path> [-Force]
```

```bash
./install-manifest.sh --manifest-path PATH [--force]
```

Manifest mode reads user-level and project-level targets from one JSON file. It copies only the listed Skill and workflow folders and does not delete installed content that is absent from the manifest.

## Target

Skills go to `~/.claude/skills` or `.claude/skills`. Workflows go to .agent-routines/workflows in the selected user or project scope.
