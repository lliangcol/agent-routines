# Distribution

## User-Level Paths

- Codex Windows: `%USERPROFILE%\.codex\skills`
- Codex macOS/Linux: `$HOME/.codex/skills`
- Claude Code Windows: `%USERPROFILE%\.claude\skills`
- Claude Code macOS/Linux: `$HOME/.claude/skills`
- Workflow Windows: `%USERPROFILE%\.agent-routines\workflows`
- Workflow macOS/Linux: `$HOME/.agent-routines/workflows`

## Project-Level Paths

- Codex project: `<repo>/.codex/skills`
- Claude Code project: `<repo>/.claude/skills`
- Workflow project: `<repo>/.agent-routines/workflows`

## Choosing Scope

Use user-level installation for personal routines that apply across repositories. Use project-level installation when a repository needs pinned behavior, reviewable Skill content, or team-specific workflow versions.

Use the static distribution manifest when a single reviewed file should decide both scopes for a known repository set. The checked-in static manifest remains `version: 1` and is intentionally additive in normal `merge` installs: it copies only the listed Skill and workflow directories and does not remove installed items that are not listed.

```json
{
  "version": 1,
  "user": {
    "codex": {
      "skills": ["guarded-change"],
      "workflows": ["preflight"]
    }
  },
  "projects": [
    {
      "path": "C:\\path\\to\\repo",
      "claudeCode": {
        "skills": ["pay-docs"],
        "workflows": ["doc-check"]
      }
    }
  ]
}
```

PowerShell manifest entrypoints use `-ManifestPath <path>`. Bash entrypoints use `--manifest-path PATH` and require one available JSON parser from `python3`, `python`, `node`, or `jq`. Relative project paths in a manifest are resolved from the source repository root. Prefer `-Mode merge`, `-Mode replace-listed`, or `-Mode dry-run` on PowerShell and `--mode merge`, `--mode replace-listed`, or `--mode dry-run` on Bash. `-Force` and `--force` are compatibility shims for `replace-listed`, not a separate distribution policy. Manifest mode should use the dedicated `install-manifest` entrypoints, not the user or project installers.

The default example manifest installs only broadly reusable Skills at user level and keeps project-level entries to common workflow runtime folders. Project-owned Skills such as repository-specific payment, database, or agent projections should stay in those projects unless explicitly promoted.

For existing machines with many user-level and project-level installs, use install discovery config v2 to generate a reviewed desired-state plan from explicit project roots instead of hand-editing distribution manifests. The generated v2 manifest includes `desiredTargets[]`, `actions[]`, `backupPlan`, `restorePlan`, unknown/unclassified report-only items, and an action summary. See [Install Discovery](install-discovery.md).

## Update Strategy

Update from the source repository, rerun validators, then run a dry-run (`-WhatIf`, `--dry-run`, or `--mode dry-run`) before replacing listed targets. Do not treat installed folders as the source of truth.

## Uninstall Strategy

Uninstallers require explicit Skill names unless removing workflows only. They never remove all Skills by default and never remove workflows unless explicitly requested.
