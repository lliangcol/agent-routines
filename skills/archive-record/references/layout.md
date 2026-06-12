# Archive Layout

## Directory Roles

- `runbooks/<os>/...` — reusable procedures that have been executed and validated at least once. A runbook that was never run belongs in `plans/`.
- `plans/` — unverified or future work. Moving a plan to `runbooks/` requires an execution record that proves it worked.
- `executions/YYYY/MM/YYYY-MM-DDTHHmm+ZZZZ-short-slug/` — one directory per real execution. The timestamp is local time with UTC offset; the slug is lowercase kebab-case (matching `[a-z0-9-]+`).

## Required Contents of an Execution Directory

| Item | Purpose | Rule |
|---|---|---|
| `README.md` | Entry point | What was done, when, scope, verdict, links to the other files |
| `result.md` | The deliverable | Full report, decision, or outcome — readable standalone |
| `evidence/` | Reviewed proof | Command outputs, validator results, screenshots — curated, redacted |
| `artifacts/` | Raw byproducts | Logs, generated files, exports — unreviewed is acceptable here |

The split matters: `evidence/` is what a reviewer can trust without rerunning anything; `artifacts/` is what they would use to rerun or dig deeper. Do not mix them.

## Writing Evidence That Survives Review

- Record the exact command, exit code, and the relevant output slice — not "it passed".
- Redact secrets and private paths before saving; an archive is often shared later under wider visibility than the original session.
- Convert relative dates ("yesterday", "last week") to absolute dates; archives are read months later.
- Name evidence files by topic (`commands.md`, `validator-runs.md`), not by sequence number.

## Validation

Run the archive-check workflow before final delivery; it enforces the directory pattern and the four required items:

```bash
./workflows/archive-check/archive-check.sh --path .
```

```powershell
.\workflows\archive-check\archive-check.ps1 -Path .
```

## Failure Cases

- Symptom: archive-check warns "No archive execution directories matched the expected layout." Wrong response: ignore the warning. Correct response: the directory name violates the timestamp pattern (common mistakes: missing UTC offset, uppercase in slug, `T` omitted); rename to match.
- Symptom: `artifacts/` is empty and git drops the directory. Correct response: add a `.gitkeep` placeholder — the validator checks the directory exists.
