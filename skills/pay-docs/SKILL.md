---
name: pay-docs
description: Use this skill for payment, subscription, and configuration documentation that must be Chinese-first, source-backed, structured, and explicit about risks and confirmations.
os: cross-platform
---

# pay-docs

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. The guidance applies to Windows, macOS, and Linux. OS-specific actions must be guarded by detection, explained before use, and skipped when unsupported.

## Flow

1. Locate source code and config. 2. Extract terminology and scenarios. 3. Build scenario matrix and config notes. 4. Add verification points, risks, and open confirmations. 5. Keep claims source-backed.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: doc-check

## Human Confirmation Gates

Ask before commit or push, production configuration changes, destructive filesystem actions, database writes, external publishing, broad dependency installation, or changes outside the requested repository.

## Failure Routing

Separate root cause from downstream symptoms. Report exact blockers, skipped actions, and the smallest safe next step.