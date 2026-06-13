# desktop-packaging-release

## Use Cases

Electron Builder or Forge configuration, desktop package metadata, Windows/macOS/Linux artifacts, signing boundaries, dry-run packaging, and release-readiness review.

## Non-Use Cases

Publishing, signing, tagging, or uploading artifacts without explicit approval.

## Supported OS

Windows, macOS, and Linux. Some package formats require their native OS or CI image.

## Inputs

Target platforms, package manager, package metadata, build output path, signing policy, and release boundary.

## Outputs

Packaging readiness, dry-run evidence, artifact risk notes, security blockers, and release approval gaps.

## Execution Steps

Run workspace checks, inspect package metadata, run dry-run packaging when approved, scan release contents, and summarize blockers.

## Human Confirmation Points

Signing, notarization, publication, version mutation, tag creation, and artifact upload.

## Failure Handling

If a platform packager cannot run locally, document the required CI or host platform instead of forcing a partial release.

## Example Prompts

- "Use `desktop-packaging-release` to check whether the Electron package is ready for Windows and macOS dry-runs."
- "Use `desktop-packaging-release` to review release artifacts without publishing."

## Recommended Workflows

node-workspace-check, release-check, security-check, gate-check
