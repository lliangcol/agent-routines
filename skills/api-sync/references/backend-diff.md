# Backend Diff

Goal: enumerate every backend contract change before touching frontend code, so the adaptation is driven by evidence instead of guesses.

## Establish the Comparison Range

```bash
git fetch origin
base="$(git merge-base origin/main HEAD)"
git log --oneline "$base"..HEAD
git diff --stat "$base"..HEAD
```

Record the base branch, base SHA, target SHA, and merge-base SHA; they go into the final summary so the sync is reproducible.

## What to Extract from the Diff

Walk the diff once per category and write down concrete identifiers, not impressions:

- Routes: added/removed/renamed paths, HTTP method changes, version prefix changes.
- Request fields: new required fields, removed fields, type changes, renamed fields, validation rule changes (length, pattern, nullability).
- Response fields: removed or renamed fields are breaking; added optional fields usually are not.
- Enum values: added values break exhaustive frontend switches; removed values break stored data rendering.
- Error codes: a new error code needs a frontend mapping; changed semantics of an existing code is the most dangerous and least visible change.
- Feature flags: a contract change behind a flag must be adapted behind the same flag.
- Migration notes: schema or data migrations that change what existing records look like to the frontend.

Useful search commands while walking:

```bash
git diff "$base"..HEAD -- '*Controller*' '*Dto*' '*Enum*'
git diff "$base"..HEAD | grep -E '^[-+].*(@(Get|Post|Put|Delete|Patch)Mapping|fastapi|router\.)'
```

## Decision Criteria

- Change is additive and optional → adaptation is optional; record it as "not synced, additive" instead of silently ignoring it.
- Change removes or renames anything the frontend references → required adaptation; find every reference before editing.
- Change only affects fields the frontend never reads → record as excluded with the reason.
- Diff includes changes you cannot classify (reflection, dynamic serialization, computed field names) → stop and ask; do not assume the serializer preserves names.

## Failure Cases

- Symptom: frontend type checks pass but runtime objects miss a field. Wrong response: add optional chaining everywhere. Correct response: the backend renamed the field in the serializer only; grep the serializer config, not just the DTO class.
- Symptom: an enum switch starts hitting the default branch in production. Wrong response: map unknown values to a generic label silently. Correct response: the backend added enum values; add explicit rendering for each new value and a logged fallback.
