---
name: commit-guard
description: Use this skill for validated local commit and optional push workflows where scope, staged content, identity, gates, and human confirmation must be handled explicitly.
os: cross-platform
---

# commit-guard

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. The guidance applies to Windows, macOS, and Linux. Shell-specific git quoting must be kept explicit and reported with the final command.

## Flow

1. Read repo-local instructions. 2. Run commit-check and relevant gates. 3. Define intended commit scope. 4. Stage only authorized files. 5. Run cached diff checks. 6. Commit with the repository identity pattern. 7. Push only when explicitly requested.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: commit-check, gate-check, preflight

## Human Confirmation Gates

Ask before staging broad or ambiguous changes, committing, pushing, rewriting history, creating tags, publishing releases, or using one-off git identity values that are not supported by repo history.

## Failure Routing

Separate worktree dirtiness, validation failures, missing git identity, protected branch errors, and remote history divergence. Report the smallest safe next step instead of retrying destructive git commands.
