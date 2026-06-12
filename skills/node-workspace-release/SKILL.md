---
name: node-workspace-release
description: Use this skill for Node, npm, pnpm, workspace, plugin marketplace, and release dry-run workflows that require validation before publishing.
os: cross-platform
---

# node-workspace-release

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Use the package manager declared by the repository and avoid global installs unless explicitly requested.

## Flow

1. Identify package manager, workspace shape, and release surface. 2. Run readonly workspace checks. 3. Inspect validate/doctor/schema scripts. 4. Prefer dry-run commands. 5. Require confirmation before publishing or installing. 6. Report exact scripts and skipped actions.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: node-workspace-check, gate-check

## Human Confirmation Gates

Ask before `npm publish`, `pnpm publish`, registry changes, dependency installation, marketplace publication, version mutation, or generated catalog writes.

## Failure Routing

Separate package-manager availability, workspace metadata, schema validation, and publication authorization.
