# electron-app-builder

## Use Cases

Electron main/preload/renderer implementation, secure IPC, local command runners, app settings, theme switching, i18n switching, and desktop operator-console workflows.

## Non-Use Cases

Generic web landing pages, mobile apps, remote SaaS dashboards, or unreviewed arbitrary shell execution.

## Supported OS

Windows, macOS, and Linux. Validate platform-specific shell behavior before relying on it.

## Inputs

Repo path, Electron app path, command allowlist, target platforms, theme requirements, language requirements, and validation gates.

## Outputs

Scoped implementation plan, changed files, IPC contract notes, command safety notes, and verification evidence.

## Execution Steps

Read project docs, implement across Electron layers, keep renderer unprivileged, run relevant checks, and report unsupported platform behavior explicitly.

## Human Confirmation Points

Broad dependency installs, user-level writes, force installs, auto-update, signing, publishing, and packaging artifacts for distribution.

## Failure Handling

If a platform prerequisite is missing, report the gap and keep the app behavior guarded instead of silently changing execution strategy.

## Example Prompts

- "Use `electron-app-builder` to add the theme setting and keep IPC allowlisted."
- "Use `electron-app-builder` to wire a safe command runner for manifest dry-runs."

## Recommended Workflows

node-workspace-check, runtime-check, security-check, gate-check
