---
name: desktop-qa
description: Use this skill for cross-platform desktop UI QA of Electron apps, including renderer screenshots, native window behavior, shell prerequisites, task logs, and platform-specific checks.
os: cross-platform
---

# desktop-qa

Use this Skill when testing or reviewing desktop app behavior across Windows, macOS, and Linux.

## Operating System Support

`os: cross-platform`. Record the host OS and shell availability before interpreting failures.

## Flow

1. Identify the target platform and app entrypoint. 2. Run environment diagnostics. 3. Exercise key renderer flows with Browser or Playwright. 4. Check native dialogs, path rendering, shortcuts, theme behavior, and language switching. 5. Verify task logs and cancellation behavior. 6. Capture screenshots and residual risks.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: runtime-check, node-workspace-check, gate-check

## Human Confirmation Gates

Ask before installing browsers, changing system settings, writing user-level app settings, or launching actions that execute distribution commands.

## Failure Routing

Separate rendering failures, platform capability gaps, missing browsers, shell gaps, command failures, and visual polish issues.
