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

Use manifest installation when a single reviewed file should decide both scopes. Manifest mode is additive: it copies only the listed Skill and workflow directories and never removes installed items that are not listed.

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

PowerShell manifest entrypoints use `-ManifestPath <path>`. Bash entrypoints use `--manifest-path PATH` and require one available JSON parser from `python3`, `python`, `node`, or `jq`. Relative project paths in a manifest are resolved from the source repository root. `-Force` and `--force` replace listed targets that already exist. Manifest mode should use the dedicated `install-manifest` entrypoints, not the user or project installers.

The default example manifest installs only broadly reusable Skills at user level and keeps project-level entries to common workflow runtime folders. Project-owned Skills such as repository-specific payment, database, or agent projections should stay in those projects unless explicitly promoted.

## Update Strategy

Update from the source repository, rerun validators, then reinstall with `--force` or `-Force` only after reviewing differences. Do not treat installed folders as the source of truth.

## Uninstall Strategy

Uninstallers require explicit Skill names unless removing workflows only. They never remove all Skills by default and never remove workflows unless explicitly requested.
