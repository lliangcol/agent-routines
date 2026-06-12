---
name: dms-repair
description: Use this skill for database repair work that must begin with readonly confirmation, prepare minimal SQL for human DMS execution, and verify with readonly post-checks.
os: cross-platform
---

# dms-repair

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. The guidance applies to Windows, macOS, and Linux. OS-specific actions must be guarded by detection, explained before use, and skipped when unsupported.

## Flow

1. Confirm current state with readonly queries. 2. Prepare minimal SQL. 3. Stop for human DMS execution. 4. Run readonly post-check after confirmation. 5. Explain source consistency and residual risk.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: db-read

## Human Confirmation Gates

Ask before commit or push, production configuration changes, destructive filesystem actions, database writes, external publishing, broad dependency installation, or changes outside the requested repository.

## Failure Routing

Separate root cause from downstream symptoms. Report exact blockers, skipped actions, and the smallest safe next step.