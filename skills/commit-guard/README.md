# commit-guard

## Use Cases

Validated local commits, commit readiness checks, staged-scope review, optional push handoff, and dirty-tree commit workflows.

## Non-Use Cases

Force pushes, history rewrites, release publication, or committing changes before the user has authorized the commit scope.

## Supported OS

Windows, macOS, and Linux. Git command construction must be shown in shell-appropriate syntax.

## Inputs

Repo path, intended scope, user request boundary, validation commands, commit message, and whether push was explicitly requested.

## Outputs

Commit readiness verdict, staged scope summary, validation results, skipped actions, commit hash when a commit is authorized, and push status when a push is authorized.

## Execution Steps

Run commit-check, inspect worktree scope, run relevant gates, stage authorized files, run cached diff checks, commit only after confirmation, then push only when requested.

## Human Confirmation Points

Staging ambiguous files, committing, pushing, rewriting history, tagging, or continuing after remote divergence.

## Failure Handling

If validation or git identity is blocked, stop before commit and report the exact command or configuration needed.

## Example Prompts

- "Validate and commit the current branch changes, but do not push."
- "Can these staged changes be committed? Give a direct verdict first."

## Recommended Workflows

commit-check, gate-check, preflight
