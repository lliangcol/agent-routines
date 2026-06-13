---
name: desktop-packaging-release
description: Use this skill for Electron desktop packaging and release readiness across Windows, macOS, and Linux, including signing boundaries, artifacts, dry-runs, and public release checks.
os: cross-platform
---

# desktop-packaging-release

Use this Skill when preparing or reviewing desktop packaging, signing, installer output, or release readiness for Electron apps.

## Operating System Support

`os: cross-platform`. Treat platform-specific packagers, signing identities, and installer formats as separate release surfaces.

## Flow

1. Identify target platforms and package formats. 2. Inspect package metadata and build scripts. 3. Run readonly workspace and release checks. 4. Prefer dry-run or directory packaging before distributable installers. 5. Verify sensitive files are excluded. 6. Require confirmation before signing, publishing, tagging, or uploading artifacts.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: node-workspace-check, release-check, security-check, gate-check

## Human Confirmation Gates

Ask before signing, notarizing, publishing, uploading artifacts, changing version numbers, creating tags, or modifying auto-update endpoints.

## Failure Routing

Separate dependency gaps, packager configuration gaps, signing identity gaps, secret leakage, and release-policy blockers.
