# DMS SQL

The repair SQL is executed by a human through the organization's DMS/change channel, never by the agent. The agent's job is to make the statement so explicit that the human reviewer can approve it without trusting the agent.

## Statement Requirements

- One logical fix per statement set; do not bundle unrelated repairs.
- Explicit WHERE clause listing primary keys whenever feasible:

```sql
UPDATE orders
SET status = 'CLOSED', updated_at = NOW()
WHERE id IN (1001, 1002)
  AND status = 'PENDING';   -- guard: only flips rows still in the broken state
```

- Include the state guard (`AND status = 'PENDING'`) so a row already fixed by another path is not double-modified.
- State the expected affected row count next to the statement ("expected: 2 rows"). A mismatch at execution time is an abort signal for the human.
- Wrap multi-statement repairs in an explicit transaction and say whether partial success is acceptable.

## Rollback Notes (Mandatory)

For every statement, write how to undo it — and be honest when it cannot be undone:

- Reversible: provide the inverse UPDATE using the captured pre-state values.
- Lossy (overwriting data not captured in pre-state): expand the pre-state SELECT first until the rollback is constructible.
- Irreversible (DELETE without archive): require explicit human sign-off naming the irreversibility.

## Human Execution Instructions

Deliver as a block the operator can paste: target instance, database, expected row counts, the SQL, the rollback SQL, and the post-check queries. State the order of operations and what to do on unexpected row count (stop, do not retry).

## Failure Cases

- Symptom: "expected 2 rows" but DMS reports 40 affected. Wrong response: assume the WHERE was just broader than estimated. Correct response: the guard predicate was wrong or data moved since the snapshot; rollback per plan and re-run the readonly phase.
- Symptom: reviewer asks why a JOIN-based UPDATE is needed. Correct response: rewrite by primary keys gathered readonly beforehand; JOIN-updates hide the affected set from review.
