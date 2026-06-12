# node-workspace-release

## Use Cases

pnpm/npm workspace validation, plugin marketplace metadata checks, release dry-runs, package scripts, and schema/doc/runtime validation.

## Non-Use Cases

Publishing packages, changing versions, or installing dependencies without explicit approval.

## Supported OS

Windows, macOS, and Linux. Prefer the repository-declared package manager and lockfile.

## Inputs

Repo path, package manager, target package, validation scripts, release command, and publish boundary.

## Outputs

Workspace inventory, available validation scripts, release risks, dry-run recommendation, and verification evidence.

## Execution Steps

Run node-workspace-check, inspect package metadata, choose existing validation scripts, run approved non-publishing checks, and report publication blockers.

## Human Confirmation Points

Dependency installs, version changes, package publishing, marketplace publication, and generated registry outputs.

## Failure Handling

If package-manager tooling is missing, report the gap and do not switch managers without evidence and approval.

## Example Prompts

- "Validate this plugin package before release; no publish."
- "Check whether the marketplace metadata and docs are internally consistent."

## Recommended Workflows

node-workspace-check, gate-check
