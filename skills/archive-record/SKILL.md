---
name: archive-record
description: Use this skill for durable execution records, runbooks, evidence folders, artifacts, and validation of archive layout after task completion.
os: cross-platform
---

# archive-record

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Path examples should use portable separators in docs and native path handling in scripts.

## Flow

1. Decide whether work is a plan, reusable runbook, or executed record. 2. Use the repository archive layout. 3. Store evidence and artifacts separately. 4. Link runbooks instead of duplicating procedures. 5. Run archive checks. 6. Report validation output.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: archive-check

## Human Confirmation Gates

Ask before deleting or moving historical records, rewriting evidence, or changing archive schema.

## Failure Routing

If archive rules only exist in memory or conversation, materialize them as docs, templates, or validators before relying on them.
