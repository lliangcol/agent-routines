# knowledge-drift

## Use Cases

Documentation drift checks, knowledge-base frontmatter review, source-path evidence verification, generated stub promotion, and stale policy detection.

## Non-Use Cases

Automatically trusting AI-generated docs, accepting fingerprints without review, or editing source behavior to match stale docs.

## Supported OS

Windows, macOS, and Linux. Checks should remain local and read-only by default.

## Inputs

Knowledge root, source root, expected frontmatter, known validation command, and review boundary.

## Outputs

Freshness findings, missing source paths, stale evidence, partial-check warnings, and remediation options.

## Execution Steps

Run drift-check, inspect current source references, classify stale claims, and recommend review or regeneration steps.

## Human Confirmation Points

Accepting fingerprints, promoting generated stubs, deleting docs, or changing policy frontmatter.

## Failure Handling

When no drift tool exists, report which checks were manual and which were skipped.

## Example Prompts

- "Check whether these KB docs still match current source."
- "Review generated documentation stubs before promoting them."

## Recommended Workflows

drift-check, doc-check
