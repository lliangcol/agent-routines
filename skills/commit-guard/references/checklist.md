# commit-guard Checklist

## Authorization First

Confirm which of these the user actually authorized — they are four different things:

1. Review only (no git state change)
2. Stage + local commit
3. Commit + push
4. Amend / rewrite (almost never; requires explicit wording)

If the request says "commit" without mentioning push, do not push. If the branch is a protected or default branch and repo rules require feature branches, stop and ask before committing to it.

## Pre-Commit Sequence

```bash
git status --short --untracked-files=all   # full picture incl. untracked
git diff --stat                            # what would be staged
./workflows/commit-check/commit-check.sh --path .   # readonly readiness probe
```

Then the repository's own gates (tests, linters, validators named in AGENTS.md / CONTRIBUTING). A commit with failing repo gates needs explicit user acknowledgement.

## Staging Discipline

- Stage by explicit path, never `git add -A` when the worktree contains unrelated dirt:

```bash
git add path/to/changed-file path/to/other-file
git diff --cached --check        # whitespace/conflict-marker gate
git diff --cached --stat         # confirm staged scope == intended scope
```

- Unrelated dirty files are reported in the summary, not staged, not reverted.

## Identity

If `user.name`/`user.email` are missing, prefer repo-local config copied from existing history rather than inventing one:

```bash
git log --format='%an <%ae>' -3          # see what this repo uses
git config user.name "..."; git config user.email "..."   # repo-local, not --global
```

## Stop Conditions

Stop and report instead of proceeding when any of these holds:

- protected branch + no explicit authorization for it
- unresolved merge state (`git diff --name-only --diff-filter=U` non-empty)
- non-fast-forward push would be required
- repo validation gates fail
- the staged diff contains files the user never mentioned

## Failure Cases

- Symptom: commit succeeds but CI fails on formatting. Wrong response: amend and force-push. Correct response: a new fix commit unless the user explicitly authorized history rewrite.
- Symptom: `git push` rejected (non-fast-forward). Wrong response: `--force`. Correct response: report; rebasing or force-pushing is a separate authorization.
