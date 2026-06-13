# AGENTS.md

Instructions for AI agents working in this repository.

## What This Repository Is

A distributable library of agent Skills (judgment, Markdown), deterministic readonly workflows (Bash + PowerShell, stable JSON output), and installation adapters. The source repository is the only maintenance source of truth; installed copies under `~/.claude`, `~/.codex`, or `.agent-routines` are targets, never sources.

## Codebase Discovery

When codebase-memory-mcp is available and this repository is indexed, prefer graph tools over text search for code discovery:

1. `search_graph` -- find functions, classes, routes, variables, and scripts by pattern.
2. `trace_path` -- trace callers, callees, or data flow.
3. `get_code_snippet` -- read specific function or class source after locating the exact qualified name.
4. `query_graph` -- run complex graph queries.
5. `get_architecture` -- get a high-level project summary.

Fall back to `rg`, file search, or direct file reading when the MCP project is not indexed, the graph results are insufficient, or the target is non-code content such as Markdown, JSON, shell scripts, CI config, or docs. Do not add a repo-local `.mcp.json` by default; MCP server paths are environment-specific and should be configured by each workspace.

## Validation Gates

Run all of these before claiming any change is done. Bash and PowerShell suites must both pass.

```bash
./tests/validate-structure.sh
./tests/validate-skills.sh
./tests/validate-workflows.sh
./tests/validate-docs.sh
./tests/validate-changelog.sh
./tests/validate-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
./tests/validate-install-discovery-config.sh --config-path ./tools/install-discovery.config.example.json
./tests/run-workflows.sh
```

```powershell
.\tests\validate-structure.ps1
.\tests\validate-skills.ps1
.\tests\validate-workflows.ps1
.\tests\validate-docs.ps1
.\tests\validate-changelog.ps1
.\tests\validate-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\tools\install-discovery.config.example.json
.\tests\run-workflows.ps1
```

## Hard Rules

- Workflow scripts must stay readonly: no file writes inside the inspected repository, no network, no database connections, no git mutations.
- Every workflow keeps `.sh` and `.ps1` behavior in parity: same checks, same JSON shape, same exit codes. A change to one implementation is incomplete until the other matches.
- PowerShell scripts must remain ASCII-only and Windows PowerShell 5.1 compatible (no `&&`, no ternary, no null-coalescing).
- Every `.sh` file must carry the executable bit in the git index. On Windows set it explicitly: `git update-index --chmod=+x <file>`.
- Adding or removing a required file means updating `tests/required-paths.txt` (single source for both validate-structure implementations).
- `docs/catalog.md` and `docs/catalog.zh-CN.md` are derived from the `Recommended workflows:` lines in `skills/*/SKILL.md`; `tests/validate-docs` enforces this. Change SKILL.md first, then the catalogs.
- Every file in `docs/` needs a `.zh-CN.md` counterpart (also enforced by `tests/validate-docs`).
- Do not commit, push, tag, publish, or modify user-level install targets without explicit human confirmation.

## Durable Records

Completed significant executions are archived under `executions/YYYY/MM/YYYY-MM-DDTHHmm+ZZZZ-short-slug/` with `README.md`, `result.md`, `evidence/`, and `artifacts/` (validated by the `archive-check` workflow).

## Releases

See `docs/release-process.md`. CHANGELOG versions must have a matching `vX.Y.Z` git tag; `tests/validate-changelog` enforces this (the newest entry may stay untagged until the release is cut).
