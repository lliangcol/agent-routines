# Changelog

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
