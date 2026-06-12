# Readonly First

No repair SQL is drafted until the current state is proven with readonly queries. The pre-state evidence is what makes the repair reviewable and the post-check meaningful.

## Sequence

1. Identify the exact database, schema, and table from configuration or code — not from memory. Confirm environment (test vs production) explicitly; the same table name existing in both is the classic trap.
2. Use the project's approved readonly wrapper or account. If none exists, the `db-read` workflow can validate SQL shape locally, but it never connects — actual execution still goes through whatever readonly channel the project sanctions.
3. Select only the columns needed to prove the problem, with the narrowest WHERE clause that still shows it:

```sql
SELECT id, status, updated_at
FROM orders
WHERE id IN (1001, 1002)   -- the exact rows reported broken
```

4. Capture the output verbatim as pre-state evidence (row count + the rows themselves), with a timestamp. This snapshot is the baseline the post-check compares against.

## Decision Criteria

- If the readonly check shows the data is already correct → stop; the symptom is elsewhere (cache, replica lag, application bug). Do not write "just in case" SQL.
- If the broken rows cannot be enumerated precisely → do not proceed to an UPDATE with a broad predicate; narrow the investigation first.
- If row counts are larger than a handful → the fix is a batch operation needing its own review and chunking plan, not a quick DMS statement.

## Failure Cases

- Symptom: readonly query returns different results on consecutive runs. Wrong response: pick the result that matches the theory. Correct response: the table is hot; capture both snapshots, identify the writer, and coordinate a quiet window before any repair.
- Symptom: SELECT works in the test environment but the production table lacks the column. Correct response: schema drift between environments is itself a finding; report it before any repair SQL is written.
