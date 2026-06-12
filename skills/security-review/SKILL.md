---
name: security-review
description: Use this skill for local security and public-leakage review before commits, releases, or distribution where sensitive values must not be printed.
os: cross-platform
---

# security-review

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Local scans should avoid uploading repository content and should redact sensitive values in summaries.

## Flow

1. Define the public or commit boundary. 2. Run security-check. 3. Inspect findings without printing secrets. 4. Classify secret-like values, private paths, brand leakage, and package leakage. 5. Stop on high-confidence sensitive content. 6. Recommend the minimum safe remediation.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: security-check, release-check, gate-check

## Human Confirmation Gates

Ask before deleting files, rewriting history, rotating credentials, changing public package contents, or approving a release with unresolved sensitive findings.

## Failure Routing

If high-confidence sensitive material is found, report only type, path, and line. Do not quote the value. Treat low-confidence pattern matches as manual review items.
