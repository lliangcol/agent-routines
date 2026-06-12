---
name: github-guard
description: Use this skill for GitHub Actions, required checks, branch ruleset, and pull request protection planning based on repository evidence.
os: cross-platform
---

# github-guard

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Local workflow inspection is cross-platform. Browser or GitHub API actions require explicit user authorization and current authentication.

## Flow

1. Inspect repository workflow evidence. 2. Run github-check. 3. Identify candidate required checks. 4. Draft conservative branch protection or ruleset settings. 5. Stop before saving remote settings unless explicitly authorized. 6. Report unverified checks.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: github-check, release-check, gate-check

## Human Confirmation Gates

Ask before creating or saving GitHub rulesets, changing branch protection, pushing workflow files, enabling required checks, or submitting PR settings.

## Failure Routing

If local workflow names do not match GitHub-accepted check names, keep the result as a draft and state which checks remain unverified.
