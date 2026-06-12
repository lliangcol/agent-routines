---
name: release-guard
description: Use this skill for public release readiness checks where package contents, metadata, documentation, dry runs, and publication gates must be verified before publishing.
os: cross-platform
---

# release-guard

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Use the repository's declared package manager and language tooling. Treat missing release tooling as a readiness gap, not permission to install dependencies.

## Flow

1. Identify the release surface. 2. Run release-check and ecosystem-specific readonly checks. 3. Inspect package metadata, docs, license, and security notes. 4. Prefer dry-run packaging commands. 5. Separate local readiness from external registry proof. 6. Publish only after explicit confirmation.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: release-check, security-check, node-workspace-check, gate-check

## Human Confirmation Gates

Ask before publishing, tagging, pushing, mutating versions, changing registry configuration, creating GitHub releases, or running dependency installation.

## Failure Routing

Separate source validation, package-content leaks, metadata gaps, dry-run failures, and external authorization blockers. Do not claim release readiness from local checks alone when external proof is missing.
