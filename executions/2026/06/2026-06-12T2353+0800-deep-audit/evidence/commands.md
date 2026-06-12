# Audit Evidence — Executed Commands

All commands were confirmed readonly before execution. `git status --porcelain` was empty before, during, and after the audit.

## Repository state

| Command | Result |
|---|---|
| `git status --short --branch` | `## main...origin/main`, clean |
| `git log --oneline -10` | 2 commits: `b004c14`, `8d65aa8` |
| `git tag -l` | empty (no tags) |
| `git remote -v` | `origin git@github.com:lliangcol/agent-routines.git` |
| `git ls-files \| wc -l` | 220 tracked files |
| `ls .github CONTRIBUTING.md SECURITY.md AGENTS.md CLAUDE.md` | none exist (exit 2) |

## Validators (PowerShell 7)

| Command | Result |
|---|---|
| `.\tests\validate-structure.ps1` | ok (136 paths checked) |
| `.\tests\validate-skills.ps1` | ok (19 skills checked) |
| `.\tests\validate-workflows.ps1` | ok (17 workflows checked) |
| `.\tests\validate-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json` | ok |

## Validators (Bash, Git Bash on Windows)

All four validators: ok, exit 0 (same counts as PowerShell).

## Workflow runtime evidence (Bash)

All run with `--path .` against this repository; all produced valid JSON with the 7 required keys:

| Workflow | exit | ok | checks | warnings | errors |
|---|---|---|---|---|---|
| preflight | 0 | true | 11 | 0 | 0 |
| commit-check | 0 | true | 11 | 2 | 0 |
| security-check | 0 | true | 3 | 1 | 0 |
| gate-check | 0 | true | 2 | 0 | 0 |
| doc-check | 0 | true | 3 | 0 | 0 |
| drift-check | 0 | true | 8 | 1 | 0 |
| governance-check | 0 | true | 12 | 1 | 0 |
| release-check | 0 | true | 15 | 2 | 0 |
| graph-check | 0 | true | 7 | 2 | 0 |
| github-check | 0 | true | 1 | 2 | 0 |

## Workflow runtime evidence (PowerShell 7)

preflight / commit-check / security-check / release-check: ok=True, check counts matched the Bash runs (11/11/3/15).

## Windows PowerShell 5.1 evidence

- `powershell.exe -NoProfile -File .\tests\validate-skills.ps1` → ok (19 skills checked), exit 0
- `powershell.exe -NoProfile -File .\workflows\preflight\preflight.ps1 -Path .` → valid JSON, ok=True, checks=11, os=windows

## Template duplication evidence

- `diff <(sed '4d' workflows/preflight/preflight.sh) <(sed '4d' workflows/<X>/<X>.sh)` → 0 diff lines for X ∈ {gate-check, merge-check, archive-check, db-read, doc-check}
- Same for the six 210-line `.ps1` scripts (8 diff lines, all in the `$workflowName`/usage area)

## Content depth evidence

- `wc -l skills/*/references/*.md` → 175 lines total across all reference files; 13 files have exactly 2 lines
- `diff skills/guarded-change/SKILL.md skills/merge-fix/SKILL.md` → 18 diff lines (name/description/flow line only)

## Cross-platform claims evidence

- `.gitattributes` forces LF for md/json/ps1/sh
- Grep scans found no PS7-only syntax and no non-ASCII bytes in any `.ps1`

## Skipped checks

- Install/uninstall adapters: not executed (write to user home directories); statically reviewed only.
- `index_repository` (codebase-memory-mcp): project not indexed; indexing creates external state and the repo has no graphable code entities; fell back to direct reading.
- `git fetch`: network access not authorized; remote tags/CI unknown.
