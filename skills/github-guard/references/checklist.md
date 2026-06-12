# github-guard Checklist

Plan branch protection and required checks from repository evidence only. The hard failure mode is naming a required check GitHub will never report — that silently blocks every merge.

## Inspect Local Workflow Evidence First

```bash
ls .github/workflows/
grep -l "pull_request" .github/workflows/*.yml      # which workflows even run on PRs
grep -E "^\s+[a-zA-Z0-9_-]+:\s*$" .github/workflows/ci.yml   # job ids
grep -E "^\s+name:" .github/workflows/ci.yml        # workflow name + job display names
```

Only recommend a check as "required" when a local workflow demonstrably produces it on `pull_request` events. A check that runs only on `push` or `schedule` never reports on PRs — requiring it deadlocks merges.

## Name Resolution: Three Different Names

| Layer | Where it lives | Example |
|---|---|---|
| Workflow file name | `.github/workflows/ci.yml` | `ci.yml` |
| Job id | YAML key under `jobs:` | `bash-validators` |
| GitHub-accepted check name | what branch protection matches | job `name:` if set, else the job id; matrix jobs expand to `name (matrix-value)` |

- Branch protection matches the **check run name**, not the file name. For `strategy.matrix`, each combination is a separate check name (`test (ubuntu-latest)`, `test (windows-latest)`) — requiring the bare `test` matches nothing.
- The only authoritative confirmation is a check name observed on a real PR (`gh pr checks <num>` or the PR Checks tab). Until observed, mark every candidate name as unverified.

## Drafting Conservative Protection

- Start with: require PR before merge, require 1 approval, require conversation resolution. Add required status checks only for names verified on a live PR.
- Prefer rulesets over classic branch protection for new setups (layerable, has bypass lists, auditable), but do not migrate existing classic rules without explicit instruction.
- Leave "require branches up to date" off initially in low-traffic repos; it forces serial merging.
- Never enable "include administrators"/zero-bypass enforcement in the same change that introduces unverified check names — lockout risk.

## Authorization Boundaries

- Reading remote state needs auth but is safe: `gh api repos/{owner}/{repo}/branches/main/protection`, `gh api repos/{owner}/{repo}/rulesets`.
- Saving rulesets, changing protection, pushing workflow files, or toggling required checks are remote writes — explicit user authorization each time, no batching under a prior yes.

## Failure Cases

- Symptom: after enabling a required check, all PRs stuck on "Expected — waiting for status". Cause: required name does not match any reported check run (typo, matrix expansion, or the workflow is path-filtered and skipped). Correct response: inspect names on the stuck PR with `gh pr checks`, fix the ruleset name or add the skipped-path case; do not tell people to bypass.
- Symptom: check passes locally but never appears on the PR. Cause: workflow triggers lack `pull_request`, or the workflow only triggers on paths the PR doesn't touch. Correct response: report as evidence gap; recommend trigger fix before requiring the check.
- Symptom: cannot verify names because there is no open PR. Correct response: deliver the ruleset as a draft with names flagged unverified and a verification step ("open the next PR, run `gh pr checks`, then enable"); do not save the ruleset speculatively.
