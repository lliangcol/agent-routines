---
name: guarded-change
description: Use this skill for governed repository code changes when local rules, branch state, risk gates, minimal edits, and verification must be handled before summarizing.
os: cross-platform
---

# guarded-change

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. The guidance applies to Windows, macOS, and Linux. OS-specific actions must be guarded by detection, explained before use, and skipped when unsupported.

## Flow

1. Read rule files such as AGENTS.md, CLAUDE.md, and nearest local instructions. 2. Inspect branch and worktree. 3. Define scope and risk. 4. Make the smallest viable change. 5. Run relevant gates. 6. Summarize changed files, verification, and skipped actions.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: preflight, gate-check

## Human Confirmation Gates

Ask before commit or push, production configuration changes, destructive filesystem actions, database writes, external publishing, broad dependency installation, or changes outside the requested repository.

## Failure Routing

Separate root cause from downstream symptoms. Report exact blockers, skipped actions, and the smallest safe next step.