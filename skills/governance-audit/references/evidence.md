# Evidence Classification

Every current-state claim in a governance audit must name its evidence and the evidence's authority tier. Mixing tiers is how audits assert rules that stopped being enforced months ago.

## Authority Tiers (Strongest First)

1. **Live command output** produced during this audit — `git log`, hook execution, a validator run with its exit code. Dated, reproducible, current by construction.
2. **Current source, config, scripts, tests** in the active checkout — `.github/workflows/*.yml`, `package.json` scripts, hook files under `.husky/`/`.git/hooks`, lint configs. These prove what *would* be enforced if the mechanism runs.
3. **Generated projections** (catalogs, index files, rendered docs) — evidence only when two conditions hold: the generator source is in tier 2, and a freshness check ran this audit (regenerate-and-diff, or a sync validator passing). A projection without a current sync check is tier 4.
4. **Archived, cutover, or historical docs** (`docs/archive/`, ADRs marked superseded, old runbooks) — context for why a rule exists; never proof that it is enforced now.
5. **Memory / prior-session knowledge** — routing hints only ("look at X"); every claim sourced from memory must be re-verified against tiers 1–2 before it enters the report.

## Enforcement vs Documentation

A rule documented in tier 2 is still only a *stated* rule. Enforcement requires a mechanism: CI gate, hook, validator in the test suite, or branch protection. For each governance claim record three fields:

- Stated where (file:line)
- Enforced by what (CI job / hook / nothing)
- Verified how (the tier-1 command and its result)

"Stated but unenforced" is a finding, not a detail — it is the most common governance gap.

## Decision Criteria

- Two sources conflict → the higher tier wins; report the conflict and the loser explicitly rather than silently picking one.
- A live verification command is blocked (no network, no permission, tool missing) → record as **residual risk / unverified**, never as implicit success. A check you could not run proves nothing.
- A doc says "we always do X" but `git log` shows commits violating X → tier 1 beats tier 2 prose; the rule is aspirational, classify accordingly.

## Failure Cases

- Symptom: audit cites a generated catalog as proof the inventory is complete. Wrong response: accept it. Correct response: run the sync check (or regenerate and diff) first; if no sync mechanism exists, the catalog is tier 4 and the inventory claim is unverified.
- Symptom: an archived runbook describes a release gate and nothing newer contradicts it. Wrong response: report the gate as current. Correct response: absence of contradiction is not currency — look for the live mechanism; if none exists, report "gate documented historically, no current enforcement found".
- Symptom: memory recalls "this repo blocks force-push". Correct response: verify via `gh api .../branches/main/protection` or ruleset inspection this session; memory only told you where to look.
