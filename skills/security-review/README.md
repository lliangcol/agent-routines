# security-review

## Use Cases

Secret-like scans, public leakage checks, package-content review, private path detection, brand debranding review, and pre-release security gates.

## Non-Use Cases

Credential rotation, incident response, destructive cleanup, or remote security scanning unless explicitly authorized.

## Supported OS

Windows, macOS, and Linux. Scans are local-first and redact sensitive values.

## Inputs

Repo path, public boundary, package boundary, known private markers, and allowed scan scope.

## Outputs

Redacted findings, severity classification, affected paths and lines, blockers, manual review items, and remediation suggestions.

## Execution Steps

Run security-check, inspect findings, classify sensitivity, avoid printing secret values, then recommend safe next steps.

## Human Confirmation Points

Deleting files, rotating credentials, rewriting history, changing release contents, or accepting residual findings.

## Failure Handling

If the scan cannot safely read a file, mark it skipped and keep the result partial.

## Example Prompts

- "Scan this repo for public-release leakage without printing secrets."
- "Before commit, check whether any private paths or secret-like values are present."

## Recommended Workflows

security-check, release-check, gate-check
