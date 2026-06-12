---
name: prompt-qa
description: Use this skill for prompt-only review, repair, and re-review where the prompt must be improved without executing the workflow it describes.
os: cross-platform
---

# prompt-qa

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Prompt review is text-first and should not depend on platform-specific commands unless the prompt itself names a platform boundary.

## Flow

1. Identify the prompt's goal and execution boundary. 2. Review for missing permissions, stop rules, evidence outputs, and unsafe ambiguity. 3. Repair the prompt. 4. Re-read the full repaired prompt. 5. Repeat until no new prompt issues remain. 6. State that the described workflow was not executed.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: none required

## Human Confirmation Gates

Ask before executing any workflow described by the prompt, accessing external systems, mutating files, committing, pushing, publishing, installing, or authorizing tools.

## Failure Routing

If a prompt cannot be made safe without a missing product decision, mark the ambiguity as `BLOCKED` instead of filling it with a risky assumption.
