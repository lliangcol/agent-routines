---
name: api-sync
description: Use this skill for backend API, DTO, or enum changes that require frontend request wrappers, types, enums, or UI adaptations.
os: cross-platform
---

# api-sync

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. The guidance applies to Windows, macOS, and Linux. OS-specific actions must be guarded by detection, explained before use, and skipped when unsupported.

## Flow

1. Compare backend base and target diffs. 2. Identify contract changes. 3. Decide frontend impact. 4. Update wrappers, types, enums, and UI. 5. Run minimal validation. 6. Report base branch, SHAs, synced and excluded changes.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: preflight, gate-check

## Human Confirmation Gates

Ask before commit or push, production configuration changes, destructive filesystem actions, database writes, external publishing, broad dependency installation, or changes outside the requested repository.

## Failure Routing

Separate root cause from downstream symptoms. Report exact blockers, skipped actions, and the smallest safe next step.