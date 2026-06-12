# Loop Model

The loop: **snapshot → review → fix → gate → re-review → final summary**. Each iteration operates on the latest diff; findings from previous iterations are history, not inputs.

## Snapshot

Pin the review target before reading any code:

```bash
git rev-parse HEAD
git merge-base HEAD origin/main          # review base
git diff $(git merge-base HEAD origin/main)...HEAD --stat
git status --short                        # uncommitted changes are part of the target or out of scope — decide and record
```

The snapshot defines in-scope: only the diff between base and target. Pre-existing issues in untouched code are out-of-scope observations for the summary, not loop work.

## Review

Read the full diff hunk by hunk, plus enough surrounding code per hunk to judge correctness (callers of changed functions, the type definitions touched values flow through). Record findings with severity, file:line, and the concrete failure scenario — "this could be a problem" without a scenario is not a finding.

## Fix

Fix only actionable, in-scope findings. Ordering matters: fix root causes before their symptoms (a wrong type fixed first may erase three downstream findings). Out-of-scope or product-decision findings go to the summary, not the worktree.

## Gate

Run the repo's gates (tests, linters, validators) after fixes, path-limited where possible. A failing gate is itself a finding for the next iteration.

## Re-Review — On the New Diff, Not the Old Findings

Re-snapshot and review the *updated* diff as if for the first time. Do not walk the previous findings list checking items off — that verifies your fixes but is blind to what the fixes introduced. The previous list is only used at the end of the iteration to confirm nothing was dropped.

## Termination

- Stop when a full review pass over the current diff yields **no new in-scope findings**. Fixed-and-verified findings do not count against termination.
- Findings oscillating (iteration N's fix recreates iteration N-2's issue) → stop looping; the two findings conflict and need a human decision. Report both sides.
- Hard cap awareness: if the loop reaches 4–5 iterations without converging, the change is likely too large to review-loop as a unit — report the state and recommend splitting.

## Final Summary

Findings fixed (with severity), findings deliberately not fixed (out-of-scope / needs-decision, with reasons), gates run with results, residual test gaps. The summary is written from the loop's records, not from memory.

## Failure Cases

- Symptom: iteration 3 reviews quickly and finds nothing, but a later reader finds an issue introduced by an iteration-2 fix. Cause: re-review walked the old findings list instead of the new diff. Correct response: each re-review is a full pass over the current diff.
- Symptom: the same gate fails every iteration with the same message. Wrong response: keep iterating around it. Correct response: the gate failure is the priority finding; resolve it or report it as a blocker before further review work.
