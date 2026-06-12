# Post-Check

The repair is not done when DMS reports success; it is done when readonly verification proves the new state matches the expectation derived from the pre-state snapshot.

## Sequence

1. Wait for the human to confirm execution and report the affected row count.
2. Compare the reported count with the expected count from the SQL plan. Mismatch → treat as incident, consider rollback, re-enter readonly investigation.
3. Re-run the exact pre-state SELECT (same columns, same WHERE) through the readonly channel and diff against the expected post-state:

```sql
SELECT id, status, updated_at
FROM orders
WHERE id IN (1001, 1002);
-- expect: both rows status='CLOSED', updated_at within the execution window
```

4. Check side effects the repair could have triggered: downstream status machines, notification outboxes, cache invalidation. Verify the ones the pre-analysis named.
5. Record pre-state, SQL, execution confirmation, and post-state together as the durable evidence pack (see archive-record).

## Decision Criteria

- Post-state matches → close with evidence.
- Post-state partially matches (some rows fixed) → do NOT immediately re-run the repair on the remainder; the guard predicate filtered them for a reason — investigate each leftover row readonly first.
- Application symptom persists although data is correct → the data was not the root cause; reopen diagnosis rather than writing more SQL.

## Failure Cases

- Symptom: post-check passes but the user reports the bug again the next day. Wrong response: run the same repair again. Correct response: something keeps re-breaking the data; find the writer (application code path, scheduled job) before any further repair.
- Symptom: post-check query is slow or blocked. Correct response: do not switch to a broader, unindexed verification query on a production primary; verify on the keys captured pre-state.
