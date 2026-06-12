# Risk Gates

Actions that require explicit human approval before execution. A gate is per-action and per-occurrence: approval to commit once is not standing approval to commit, and approval in one repo does not transfer to another.

## Gated Actions

| Gate | Why it gates | What to present when asking |
|---|---|---|
| `git commit` / `git push` / tags | Publishes history; push is visible to others and hard to retract | Exact diff stat, proposed message, target branch/remote |
| Database writes (any INSERT/UPDATE/DELETE/DDL) | Data loss potential; often no undo | Statement, expected row count, rollback plan (see dms-repair for the full protocol) |
| Production configuration | Affects live traffic immediately | Current value, new value, blast radius, revert command |
| Deletes / overwrites of files not created this session | Irreversible without backup | What exists at the target now, why it must go |
| External publishing (package registry, PR/issue comments, API posts, sending messages) | Leaves the machine; may be cached/indexed even if deleted | Exact content to be published, destination |
| Broad dependency installation / version bumps | Supply-chain surface, lockfile churn | Package list, why needed, lockfile impact |
| Any edit outside the declared blast radius | Scope contract violation | The ripple measurement, narrow alternative if one exists |

## Gate Protocol

1. Stop before the action, not after a "dry run" of it that already mutated state.
2. Present the evidence column above — the human approves a concrete artifact (this diff, this SQL, this message), never a category ("ok to commit stuff").
3. On approval, execute exactly what was shown. If anything changed in between (new diff hunks, different row count), re-gate.
4. On denial or silence, record the action as skipped in the summary with what remains for the human to do.

## Decision Criteria

- Reversible + inside declared scope + local-only → proceed without gating; this is what step 4's blast radius declaration buys.
- Unsure whether an action is destructive → treat it as gated. The cost of over-asking is a question; the cost of under-asking is an incident.
- A repo rule file (AGENTS.md) grants standing approval for a category (e.g., "commits allowed without asking") → that is durable authorization for that repo only; everything not named stays gated.

## Failure Cases

- Symptom: a "safe" command turns out to mutate state (`mvn verify` writing to a shared repo, a test suite that seeds a real database). Correct response: stop on discovery, report what was mutated, do not continue the run; mutating side channels reclassify the command as gated for the rest of the session.
- Symptom: the human approved a push, then review feedback changed the commit. Correct response: re-gate — the approved artifact no longer exists.
