---
name: knowledge-drift
description: Use this skill for checking whether Markdown knowledge, documentation, generated stubs, or evidence packs still match current source paths and policies.
os: cross-platform
---

# knowledge-drift

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Drift checks must be local-first and should not upload repository content.

## Flow

1. Identify knowledge files and covered source paths. 2. Run drift checks. 3. Compare claims against current source. 4. Classify stale, missing, or unverified evidence. 5. Avoid accepting generated content without review. 6. Report remediation options.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: drift-check, doc-check

## Human Confirmation Gates

Ask before accepting new fingerprints, promoting generated stubs, deleting docs, or changing source-bound policy.

## Failure Routing

If a specialized drift tool is missing, fall back to explicit source-path inspection and label the result as partial.
