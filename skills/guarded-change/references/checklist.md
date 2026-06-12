# guarded-change Checklist

Ordered sequence for a governed code change. Each step produces evidence the summary cites; skipping a step means saying so in the summary, not silently proceeding.

## 1. Load Rules

Read `AGENTS.md` / `CLAUDE.md` at repo root, then the nearest instruction file above the files you will touch (nested rules override root). Extract: required gates, forbidden actions, commit/branch policy. Rules read after editing don't count — they shape the plan.

## 2. Identify Branch and Worktree State

```bash
git branch --show-current
git status --short
git log --oneline -5
```

- On the default branch with a change requested → check the rules' branch policy before editing; many repos require a feature branch.
- Detached HEAD, mid-rebase/merge (`.git/MERGE_HEAD`, `rebase-merge/` present) → stop and report; do not edit on top of an unfinished operation.

## 3. List Dirty Files Before Touching Anything

Record `git status --short` output verbatim. This snapshot is what separates pre-existing dirt from your change later. Without it, every unrelated modification becomes attributable to you.

## 4. Define Blast Radius

Before the first edit, write down: files you intend to modify, files that may be regenerated as a consequence (lockfiles, snapshots, generated docs), and everything else (= out of scope). A change touching files outside the declared radius triggers a risk gate (see risk-gates), not an expanding TODO.

## 5. Edit Narrowly

- Smallest viable diff that satisfies the request; no drive-by refactors, formatting sweeps, or dependency bumps unless they ARE the request.
- Match surrounding style rather than imposing your own; do not reformat lines you are not changing.
- If the correct fix genuinely requires widening scope (interface change ripples into callers), pause at the gate and confirm — widening is a decision, not a default.

## 6. Path-Limited Verification

Run the narrowest gate that covers the change: the affected module's tests, the linter on changed files, the repo's documented validators. Record exact command + exit code. A full-suite run is the fallback when no narrower target exists, not the default.

```bash
git diff --stat            # confirm the diff matches the declared radius
git status --short         # confirm no surprise files appeared vs the step-3 snapshot
```

## 7. Summarize With Evidence

The summary names: files changed (with why), verification commands and their results verbatim, gates that were skipped and why, pre-existing dirt observed in step 3, and anything left for the human (commit, push, deploy). "Tests pass" without the command and output is not evidence.

## Failure Cases

- Symptom: verification fails on something unrelated to the change. Wrong response: fix the unrelated failure too. Correct response: confirm it fails the same way on the pre-change state (stash/worktree), then report it as pre-existing and out of scope.
- Symptom: the fix works but a generated file changed unexpectedly. Correct response: determine whether the generator legitimately ran; if not, revert the generated file and investigate — do not commit noise.
