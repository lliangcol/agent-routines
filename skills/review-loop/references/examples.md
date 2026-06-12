# Examples

Worked loop judgments. The recurring rule: attribute each symptom to its layer before reacting — fix root causes, re-verify downstream symptoms, and never chase a symptom whose root cause is already fixed.

## Downstream test failure after a root-cause fix

Situation: round 1 finds a bug in `parseAmount` (in-scope, Blocker) and a failing integration test `checkout.spec` that consumes its output. The fix lands in round 1's fix stage. Round 2's gate run shows `checkout.spec` passing.

Judgment: the `checkout.spec` failure was a *downstream symptom* of the `parseAmount` defect, not a second issue. It is recorded as fixed-verified under the same finding — not as a separate finding that was "fixed without a code change". The evidence is the rerun: same test, same command, now green, with no edits to the test itself.

The trap to avoid: round 1 logging two findings (parser bug + "flaky checkout test") and round 2 "fixing" the test by relaxing its assertion. Before treating any failing test as its own finding, check whether an already-identified root cause sits upstream of it; the dependency direction (`checkout.spec` imports/exercises `parseAmount`) is checkable, not guessable.

## The inverse: rerun still fails after the fix

Same setup, but round 2's rerun of `checkout.spec` still fails. Now it IS a separate finding — the root-cause hypothesis was incomplete. Wrong response: patch the test to match current output. Correct response: diagnose the remaining delta with the fixed parser in place; the new failure output (diffed against round 1's failure output) shows what the first fix did and did not change.

## Fix introduces a new finding

Round 1: missing null check in `getDiscount` (Major). The round-1 fix adds an early return. Round 2's full re-review notices the early return skips the audit-log call that every other exit path makes (new Minor, in-scope, introduced by the fix).

This is the loop working as designed — it is why re-review reads the *new* diff in full instead of re-checking the old findings list. The new finding is recorded with status "new (introduced in round 1 fix)", fixed in round 2, and the loop runs a round 3 pass over that fix.

## Decision Criteria

- Failing test + upstream in-scope finding already fixed + rerun passes → same finding, downstream symptom, close as fixed-verified.
- Failing test + rerun still fails after the upstream fix → new finding; diff the failure outputs between rounds for the remaining delta.
- Two findings share a fix → merge them under one root cause in the summary; counting symptoms separately inflates the finding count and obscures the actual defect.
