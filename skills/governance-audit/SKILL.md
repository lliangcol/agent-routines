---
name: governance-audit
description: Use this skill for source-first repository governance audits that must separate current evidence from archived docs, historical context, assumptions, and command output.
os: cross-platform
---

# governance-audit

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Claims must be tied to current files and command output available in the active checkout.

## Flow

1. Read current rule files and source-of-truth docs. 2. Run governance checks. 3. Classify evidence authority. 4. Exclude archived or cutover history from current-state claims. 5. Report gaps and confidence. 6. Recommend mechanical gates when possible.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: governance-check, preflight

## Human Confirmation Gates

Ask before changing governance policy, hooks, CI, MCP configuration, agent projections, or release gates.

## Failure Routing

When evidence conflicts, prefer current source, config, scripts, tests, and command output over memory or archived documents.
