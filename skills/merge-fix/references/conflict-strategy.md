# Conflict Strategy

A merge conflict is two valid intents colliding, not one correct side and one wrong side. The resolution must preserve both intents unless evidence proves one obsolete.

## Understand Before Editing

For each conflicted file, establish what each branch was *trying to do* — not just what its lines look like:

```bash
git log --oneline --left-right HEAD...MERGE_HEAD -- path/to/file   # commits touching the file on each side
git log -1 --format='%s%n%b' <commit>                              # the stated intent
git diff HEAD...MERGE_HEAD -- path/to/file                         # their net change
git diff MERGE_HEAD...HEAD -- path/to/file                         # our net change
```

Read the surrounding code beyond the conflict hunk — conflicts mark only where *lines* collide; the semantic collision (both sides renamed the same concept differently, both added a handler for the same event) often extends outside the markers and produces no conflict at all.

## Resolution Patterns

| Shape | Resolution |
|---|---|
| Both sides add independent code in the same region (imports, list entries, case branches) | Keep both, order per file convention |
| One side refactors structure, other changes behavior inside old structure | Re-apply the behavior change inside the new structure — never pick a side wholesale |
| Both sides fix the same bug differently | Pick the fix that matches surrounding idiom; verify the other branch's tests still pass against it |
| One side deletes what the other modifies (delete/modify conflict) | Find out *why* it was deleted (`git log --diff-filter=D`); deletion for obsolescence usually wins, deletion as a move means re-applying the modification at the new location |
| Lockfiles / generated files | Do not hand-merge; resolve the source (manifest) first, then regenerate (see examples) |

## When Wholesale Replacement Is Legitimate

Taking one side entirely (`git checkout --ours/--theirs -- <path>`) is justified only with positive evidence the other side is obsolete: superseded by the kept side's commits, reverted upstream, or a generated artifact about to be regenerated. "The diff was too messy" is not evidence. Record which side was taken and the evidence, per file.

## Failure Cases

- Symptom: merge compiles but a feature from one branch silently no-ops afterward. Cause: structural refactor side was kept, behavior change inside the old structure was dropped. Correct response: walk each side's net diff (commands above) and confirm every behavioral change survived into the resolution — compilation proves nothing about intent.
- Symptom: same conflict keeps reappearing across merges. Cause: resolution diverges from both branches and re-conflicts every sync. Consider whether the underlying change belongs upstream, and mention `git rerere` as user-enabled tooling.
- Symptom: conflict in a file you don't understand (foreign subsystem, unfamiliar language). Correct response: stop and escalate with both sides' intents summarized — a syntactically clean but semantically wrong resolution is worse than a reported blocker.
