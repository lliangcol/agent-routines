---
name: runtime-repair
description: Use this skill for local agent runtime diagnosis and repair planning involving launch shims, package managers, hook stdin encoding, auto-update state, and version triage.
os: cross-platform
---

# runtime-repair

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Windows-specific runtime issues must be separated from POSIX shell behavior, and any environment mutation requires explicit confirmation.

## Flow

1. Capture the exact launch failure or hook symptom. 2. Run readonly runtime checks. 3. Separate PATH, shim, package tree, auth, version, and encoding causes. 4. Reproduce byte-sensitive hook failures with generated payloads. 5. Propose the smallest repair. 6. Verify after authorized changes only.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: runtime-check, preflight

## Human Confirmation Gates

Ask before reinstalling packages, changing user config, disabling auto-update behavior, editing hooks, or modifying PATH.

## Failure Routing

Do not collapse runtime failures into one cause. Report the exact layer that failed and any downstream symptoms that should not be fixed first.
