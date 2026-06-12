# Examples

Worked resolutions. The recurring rule: resolve at the layer where the truth lives — source over generated output, manifest over lockfile, intent over lines.

## Generated docs conflict → resolve the manifest, regenerate

Situation: both branches regenerated `docs/catalog.md` from a manifest, and the catalog conflicts in dozens of hunks.

Handling: never hand-merge generator output — the merged file would match neither branch's generator run and drifts immediately.

```bash
git checkout --ours -- docs/catalog.md      # park the generated file (either side; it gets overwritten)
# resolve the actual conflict in the source manifest first
git diff HEAD...MERGE_HEAD -- manifest.json
# after the manifest is resolved: regenerate
<repo's generate command>
git add manifest.json docs/catalog.md
```

Verify the regenerated file is reachable from the merged manifest alone (clean regenerate produces no diff). Report: "catalog.md resolved by regeneration from merged manifest, not by hand."

## Lockfile conflict

Same principle: resolve `package.json` by intent (keep both dependency additions), then regenerate the lockfile with the package manager rather than merging it textually:

```bash
git checkout --theirs -- package-lock.json   # placeholder; about to be regenerated
npm install                                   # rewrites the lockfile from merged package.json
```

A hand-merged lockfile can encode a dependency tree no resolver ever produced — installs may work today and break unreproducibly later.

## Both branches added a migration with the same sequence number

Situation: `migrations/0042_add_index.sql` (ours) vs `0042_add_column.sql` (theirs) — no textual conflict, but the migration runner requires unique ordering.

Handling: textual merge tools pass this silently; the conflict is semantic. Renumber the later-merged migration to `0043`, confirm the runner's ordering rules (timestamp vs sequence), and run the migration tool's dry-run/status command as verification. This is why merge verification cannot stop at "no conflict markers remain".

## Decision Criteria

- File is generated → find its source, resolve there, regenerate; the generated file never gets manual hunks.
- Conflict-free but semantically colliding (duplicate IDs, duplicate routes, duplicate case labels) → hunt for these explicitly in areas both branches touched; `git diff --stat HEAD...MERGE_HEAD` intersected with `git diff --stat MERGE_HEAD...HEAD` lists the co-touched files.
