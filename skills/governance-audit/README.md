# governance-audit

## Use Cases

Current-state AI governance audits, repo policy reviews, evidence-gate analysis, archived-doc boundary checks, and readiness classification.

## Non-Use Cases

Implementing governance changes before the current state is established, or treating archived plans as live enforcement.

## Supported OS

Windows, macOS, and Linux. OS-specific command availability must be reported as part of the evidence boundary.

## Inputs

Repo path, audit question, known rule files, allowed commands, and whether the task is read-only.

## Outputs

Authority-classified findings, current-state evidence, stale or historical evidence, gaps, and recommended gates.

## Execution Steps

Run governance-check, inspect current source and scripts, classify evidence, avoid historical overclaims, then summarize risks and next actions.

## Human Confirmation Points

Editing rule files, hooks, CI, MCP, agent projections, release gates, or generated governance reports.

## Failure Handling

If live checks are blocked, state the blocker and avoid upgrading archived evidence into current proof.

## Example Prompts

- "Audit current governance only; do not rely on archived plans."
- "Tell me which agent readiness claims are supported by live checkout evidence."

## Recommended Workflows

governance-check, preflight
