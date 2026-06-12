# Verification

A merge is verified in layers; each layer catches what the previous one cannot. Stop at the first failing layer, fix, and restart from that layer.

## Layer 1: No Unmerged Paths

```bash
git status --short            # no 'UU', 'AA', 'DU', 'UD' entries
git diff --name-only --diff-filter=U   # must print nothing
```

## Layer 2: No Conflict Markers Left Behind

```bash
git grep -nE '^(<{7}|={7}|>{7})( |$)' -- ':!*.md.snap'
```

```powershell
git grep -nE '^(<{7}|={7}|>{7})( |$)'
```

Anchored to line start and exactly seven characters — heredocs and `=======` underlines in docs false-positive with looser patterns. Check *all* files, not just the ones that conflicted: a previous bad resolution may have committed markers earlier.

## Layer 3: The Diff Makes Sense

```bash
git diff HEAD...MERGE_HEAD --stat     # what they changed
git diff --staged --stat              # what the resolution stages
```

Every file in the resolution should be explainable as: their change, our change, or a named manual resolution. A file staged in the merge that neither side touched is a red flag (accidental edit, regeneration side effect).

## Layer 4: Semantic Collisions in Co-Touched Areas

For files/directories both branches touched (even without textual conflict), check for duplicate identifiers, routes, migration numbers, config keys — the collisions git cannot see. Targeted grep beats re-reading everything:

```bash
comm -12 <(git diff --name-only HEAD...MERGE_HEAD | sort) \
         <(git diff --name-only MERGE_HEAD...HEAD | sort)   # co-touched files
```

## Layer 5: Path-Limited Build/Tests/Generators

Run the narrowest gate covering the resolved files: the affected module's tests, the linter on resolved paths, regeneration checks for any generated file in the merge (regenerate → `git diff --exit-code` proves the committed output matches the merged source). A full suite is the fallback, not the default — but a merge touching shared/core code earns the full suite.

## Failure Cases

- Symptom: layer 5 fails in a file you did not resolve. Cause: usually a semantic collision (layer 4 miss) — the other branch depended on something your branch changed. Correct response: diagnose as a merge interaction, not as a pre-existing failure, unless the same test fails on both parent commits (verify with `git stash` / worktree on each parent).
- Symptom: tests pass but the merge commit's diff against each parent shows an intended change missing. Cause: wholesale side-picking during resolution. Correct response: re-apply the lost change; add its absence to the summary so reviewers know the resolution was corrected.
- Symptom: verification is too slow to run path-limited (monolithic build). Correct response: run it anyway or report the gate as skipped with the exact command the human should run — never summarize a merge as verified when only layers 1–2 ran.
