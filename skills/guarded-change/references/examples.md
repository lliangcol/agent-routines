# Examples

Worked scope-discipline cases. The recurring rule: your diff carries only the requested change; everything else gets reported, not absorbed and not destroyed.

## Formatter touches unrelated files

Situation: the requested fix is one function in `src/order.ts`. The repo's on-save formatter (or a pre-commit hook run locally) also reformats `src/legacy/util.ts`, which was inconsistently formatted.

Handling:

```bash
git status --short          # M src/order.ts, M src/legacy/util.ts
git diff src/legacy/util.ts # whitespace-only churn, not part of the request
git checkout -- src/legacy/util.ts   # safe: file was clean before this session (step-3 snapshot proves it)
```

Keep the requested fix isolated. Reverting the formatter churn is safe **only because** the pre-change snapshot shows the file was clean — the churn was produced by this session's tooling. Report: "formatter also reformats `src/legacy/util.ts`; reverted to keep the diff minimal; the file is non-compliant with the current formatter config (pre-existing)."

## Pre-existing dirty file overlaps the change

Situation: step-3 snapshot shows `src/config.ts` already modified by the user, and the requested fix also needs to touch it.

Handling: do NOT revert, stash, or "clean up" the user's edits — they were there before the session and may be deliberate work in progress. Make the requested edit on top, and in the summary separate the two: "this file contained pre-existing uncommitted changes (lines N–M, not mine); my change is lines X–Y." If the pre-existing edits directly conflict with the fix, stop at a gate and ask rather than overwriting.

## The fix wants to ripple

Situation: fixing a function signature requires updating 14 call sites across 3 packages — far beyond the named scope of "fix this function".

Handling: stop after measuring the ripple (`grep -rn "functionName("` to count call sites), present the radius, and confirm before proceeding. The alternative — a backward-compatible overload/adapter keeping the change to one file — should be offered as the narrow option. Widening silently and presenting a 17-file diff as "the fix" violates the scope contract even when every edit is correct.

## Decision Criteria

- Unrelated dirt produced **by this session's tooling** → revert it, report the underlying inconsistency.
- Unrelated dirt that **predates the session** → leave it untouched, report it, attribute it clearly.
- Required scope exceeds the named scope → gate and confirm; offer the narrowest alternative.
