# Changelog

## 0.4.0 - 2026-06-13

- Hardened `doc-check` custom command screening to match `gate-check`: shell control characters, destructive keywords, `--output`, non-allowlisted commands, and non-readonly `git` subcommands are rejected.
- Added public release governance: root `SECURITY.md` / `SUPPORT.md` with Chinese counterparts, `release-check` public mode, and docs that require these files before public promotion.
- Added config-driven install discovery with dry-run manifest generation, reviewed config validation, and CI coverage for the example config.
- Persisted graph-first code discovery guidance in `AGENTS.md` and documentation without adding a repo-local `.mcp.json`.
- Strengthened workflow and manifest validators for schema/sample drift and duplicate names inside manifest blocks.
- Refined release/security checks so public release mode reports only real blockers and nested dependency/build output directories are skipped during local secret scans.
- Added installer dry-run support (`-WhatIf` for PowerShell, `--dry-run` for Bash) across user, project, and manifest install entrypoints.
- Pinned GitHub Actions dependencies to commit SHAs while documenting the upstream tags.

## 0.3.0 - 2026-06-13

- Fixed the executable bit on all 34 tracked `.sh` files (`git update-index --chmod=+x`); direct `./tests/*.sh` invocation previously failed with Permission denied on Linux/macOS checkouts. CI keeps a defensive `chmod +x tests/*.sh` step.
- Added sh-vs-ps1 parity assertions to `tests/run-workflows.{sh,ps1}`: when the counterpart shell is available, every workflow runs through both implementations and must produce the same exit code, ok flag, check names, and warning/error counts.
- Tightened gate-check custom command screening: shell control characters are rejected, the first token must be on a readonly-command allowlist (including a readonly git subcommand list), and the destructive-keyword denylist now also rejects `--output`. Two new smoke cases cover the control-character and allowlist rejections.
- Extended the db-read SQL denylist with `into`, `copy`, `load`, `attach`, `vacuum`, and `lock`.
- Renamed the shadowed PowerShell automatic variable `$args` in gate-check to `$shellArgs`.
- Added `tests/validate-changelog.{sh,ps1}`: every CHANGELOG version except the newest must have a matching `vX.Y.Z` git tag and every tag a CHANGELOG entry; wired into the local gates and CI (checkouts now fetch tags).
- Added readonly installation self-check commands: `adapters/common/check-install.{ps1,sh}` plus `check-user` and `check-project` wrappers for Claude Code and Codex, reporting ok/drift/broken per installed routine.
- Added a gitleaks secret-scan job to CI.
- Added `.github/CODEOWNERS` and a pull request template; documented the expected `main` branch protection settings in `CONTRIBUTING.md`.
- Documented the executable-bit hard rule for new `.sh` files in `AGENTS.md` and `CONTRIBUTING.md`.

## 0.2.0 - 2026-06-13

- Added GitHub Actions CI running all validation gates on Ubuntu, macOS, and Windows (PowerShell 7 and Windows PowerShell 5.1).
- Specialized the 12 template-derived workflow scripts (preflight, gate-check, merge-check, archive-check, db-read, doc-check) and removed dead argument branches.
- Reworded the `--custom-command` option in gate-check and doc-check to state honestly that screening is a best-effort keyword denylist, with a matching runtime warning.
- Hardened Bash `json_escape` in all 17 workflows against control characters and added escapes for backspace and form feed.
- Tightened all 17 workflow schemas: workflow name as `const`, os enum, required check fields, `additionalProperties: false`.
- Added workflow smoke tests (`tests/run-workflows.sh` / `.ps1`) that execute every workflow against a fixture repository and validate the JSON contract, including db-read SQL gating and gate-check command screening cases.
- Moved the required-path list into `tests/required-paths.txt`, consumed by both validate-structure implementations.
- Added `tests/validate-docs.sh` / `.ps1` for bilingual documentation pairing and catalog-to-SKILL.md consistency.
- Fixed catalog matching-skills drift and completed env-audit workflow recommendations (runtime-check, startup-check).
- Added `AGENTS.md`, `CONTRIBUTING.md`, and `docs/release-process.md` (+ Chinese version); completed `docs/distribution.zh-CN.md` manifest documentation; rewrote both authoring guides around the real contracts.
- Enriched all 19 Skills' reference files with operational knowledge: decision criteria, command sequences for PowerShell and POSIX, and failure cases.
- Archived the 2026-06-12 deep audit under `executions/` following the archive-record layout.
- Tagged the previous state retroactively as v0.1.0.

## 0.1.0 - 2026-06-12

- Initial cross-platform Agent Routines repository.
- Added seven reusable Skills.
- Added six deterministic workflows with PowerShell and Bash entrypoints.
- Added Codex and Claude Code installation adapters.
- Added JSON manifest-based distribution for selected user-level and project-level Skills and workflows.
- Added six high-frequency Skills and six readonly workflows for runtime, Maven, governance, Node workspace, drift, and startup checks.
- Added commit, prompt QA, release, security, GitHub policy, and graph-audit Skills plus commit, release, security, GitHub, and graph readonly workflows.
- Added English and Chinese routine catalog and examples documentation.
- Added validation scripts and distribution documentation.
