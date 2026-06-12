# release-guard

## Use Cases

Public release readiness, package dry-run review, metadata audits, user-facing documentation checks, and release blocker classification.

## Non-Use Cases

Publishing, tagging, pushing, changing package versions, or creating release artifacts without explicit authorization.

## Supported OS

Windows, macOS, and Linux. Ecosystem-specific commands must be chosen from the repository's own metadata.

## Inputs

Repo path, intended release target, package ecosystem, release checklist, validation commands, and publication boundary.

## Outputs

Release readiness verdict, package metadata gaps, dry-run evidence, skipped external proof, blockers, and next actions.

## Execution Steps

Run release-check, run relevant ecosystem checks, inspect docs and metadata, run authorized dry-runs, classify blockers, and stop before publication unless authorized.

## Human Confirmation Points

Publishing, tagging, pushing, version mutation, registry changes, or release creation.

## Failure Handling

If dry-run or package proof is unavailable, report the release verdict as conditional rather than green.

## Example Prompts

- "Review whether this package is ready for public release. Do not publish."
- "Run release readiness checks and separate local proof from external gaps."

## Recommended Workflows

release-check, security-check, node-workspace-check, gate-check
