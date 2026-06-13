---
name: electron-app-builder
description: Use this skill for Electron desktop app implementation with secure main/preload/renderer boundaries, allowlisted IPC, local command execution, themes, i18n, and cross-platform behavior.
os: cross-platform
---

# electron-app-builder

Use this Skill when implementing or reviewing the Agent Routines Manager Electron app or a similar local desktop operator console.

## Operating System Support

`os: cross-platform`. Cover Windows, macOS, and Linux. Prefer repository scripts through the platform-specific entrypoints documented by the project.

## Flow

1. Read local app docs and security rules before coding. 2. Keep Electron main, preload, and renderer responsibilities separate. 3. Expose only typed, parameter-validated IPC calls. 4. Route subprocess execution through an allowlist. 5. Implement theme and language state through stable tokens and translation keys. 6. Verify renderer behavior and repository gates before summarizing.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: node-workspace-check, runtime-check, security-check, gate-check

## Human Confirmation Gates

Ask before adding broad dependencies, enabling auto-update, writing user-level settings, changing installer behavior, executing force installs, or packaging for release.

## Failure Routing

Separate renderer bugs, IPC contract failures, subprocess failures, platform gaps, and packaging gaps. Report the smallest verified next step.
