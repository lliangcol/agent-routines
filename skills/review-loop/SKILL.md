---
name: review-loop
description: Use this skill when asked to review current branch changes, fix actionable issues, and repeat review until no new in-scope issues remain.
os: cross-platform
---

# review-loop

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. The guidance applies to Windows, macOS, and Linux. OS-specific actions must be guarded by detection, explained before use, and skipped when unsupported.

## Flow

1. Snapshot current diff. 2. Review for bugs and regressions. 3. Fix actionable in-scope issues. 4. Run gates. 5. Re-review the updated diff. 6. Stop when no new in-scope issues remain.

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