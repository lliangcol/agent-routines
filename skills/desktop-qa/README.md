# desktop-qa

## Use Cases

Electron renderer checks, screenshots, light/dark/system theme QA, language switch QA, native dialog behavior, shortcuts, path display, and task-center behavior.

## Non-Use Cases

Security review, packaging release approval, or broad UI redesign without a concrete test target.

## Supported OS

Windows, macOS, and Linux. Capture the host platform in every QA report.

## Inputs

App path, dev server URL or Electron command, target flows, expected theme/language behavior, and platform prerequisites.

## Outputs

Screenshots, console errors, failed flows, platform gaps, and concrete fix recommendations.

## Execution Steps

Run runtime checks, start the app or dev server, exercise core flows, capture screenshots, inspect logs, and summarize blockers.

## Human Confirmation Points

Browser installation, user-setting writes, destructive app actions, and distribution execution.

## Failure Handling

If a platform cannot be tested on the current host, mark it unverified and state the required host or CI runner.

## Example Prompts

- "Use `desktop-qa` to verify the install matrix in light and dark themes."
- "Use `desktop-qa` to test Windows path rendering and command log behavior."

## Recommended Workflows

runtime-check, node-workspace-check, gate-check
