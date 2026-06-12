---
name: env-audit
description: Use this skill for cross-platform environment, dependency, shell, PATH, and toolchain audits that must stay readonly unless changes are explicitly authorized.
os: cross-platform
---

# env-audit

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. The guidance applies to Windows, macOS, and Linux. OS-specific actions must be guarded by detection, explained before use, and skipped when unsupported.

## Flow

1. Detect OS and shell. 2. Run readonly audit. 3. Separate symptom and root cause. 4. Identify minimum missing prerequisites. 5. Recommend next action. 6. Verify only if changes are authorized.

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