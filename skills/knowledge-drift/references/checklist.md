# Knowledge Drift Checklist

Determine whether knowledge files (docs, generated stubs, evidence packs) still describe the current source. Drift is judged claim by claim against the checkout, never by document age alone.

## 1. Establish the Two Roots

- Source root: where the authoritative code/config lives (usually the repo root or a service directory).
- Knowledge root: where the claims live (`docs/`, knowledge bases, generated catalogs, agent instruction files).

Drift is always a relation between the two; a knowledge file with no identifiable covered source paths cannot be drift-checked, only flagged as unanchored.

## 2. Read Coverage Metadata

Check frontmatter / headers for: covered paths or globs, policy version, last-reviewed date or commit, generator identity for generated files. Files carrying coverage metadata get checked against it; files without it get coverage inferred from the paths they mention — state which mode applied.

## 3. Verify Referenced Paths Exist

```bash
grep -oE '`[^`]+\.(md|ts|py|java|json|ya?ml|sh|ps1)`' doc.md   # extract path-like claims
# then for each candidate:
test -e <path> || echo "MISSING <path>"
```

```powershell
Test-Path <path>
```

A referenced path that no longer exists is the cheapest, most objective drift signal — collect all of them before judging anything subjective.

## 4. Compare Claims Against Current Source

For each substantive claim (a command, a config key, a flow description), locate the source that backs it and check it still holds. Classify per claim:

- **Current** — backed by existing source verified this session.
- **Stale** — source exists but contradicts the claim (renamed flag, changed default, removed step).
- **Missing** — the backing source is gone.
- **Unverified** — could not be checked (tool unavailable, external system); never silently lump these with Current.

## 5. Generated Content Is Untrusted Until Reviewed

A generated stub or projection is a *proposal*. Do not accept new fingerprints, checksums, or "mark as synced" states mechanically — a regenerate-and-accept loop happily launders a generator bug into blessed knowledge. Diff generated output against the previous accepted version and route the diff through human review.

## 6. Prefer Validator Output Over Eyeballing

If the repo ships drift/doc validators, run them first and treat their output as the baseline; manual inspection covers only what the validators don't. Report which checks were mechanical and which were manual.

## Decision Criteria

- Stale claim in a hand-written doc → propose the minimal correcting edit; do not rewrite the document around it.
- Stale claim in generated output → fix the source/manifest and regenerate; hand-editing generated files creates a second drift axis.
- Whole document covers a removed subsystem → recommend archive/move per the repo's archive convention, not deletion (deletion gates on human approval).

## Failure Cases

- Symptom: doc says step X is required, source shows the step automated away. Wrong response: delete the section. Correct response: stale — update to describe the automation, preserve the why-it-existed context if it still aids debugging.
- Symptom: drift tooling unavailable in this session. Correct response: fall back to path-existence checks plus claim sampling on the highest-traffic docs, and label the result partial — never report full coverage from a sample.
- Symptom: a fingerprint file shows 40 entries changed after regeneration. Wrong response: accept all to make the validator green. Correct response: that volume signals a generator or config change; identify the cause first, then review the entries in groups.
