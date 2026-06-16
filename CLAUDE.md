# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

A distributable library of agent Skills (Markdown judgment files), deterministic readonly workflows (paired Bash + PowerShell scripts), installation adapters for Codex and Claude Code, and an Electron desktop manager app. The source repository is the only maintenance source of truth — installed copies under `~/.claude`, `~/.codex`, or `.agent-routines` are targets, never sources.

## Validation Gates

Run all gates before committing. Both Bash and PowerShell suites must pass.

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

`run-workflows` also asserts sh-vs-ps1 parity (exit code, `ok` flag, check names, warning/error counts) whenever both shells are available.

## Electron Manager App (`apps/agent-routines-manager/`)

```bash
cd apps/agent-routines-manager
npm install
npm run dev          # launch dev with hot-reload renderer
npm run build        # compile main (tsc) + renderer (vite)
npm run typecheck    # type-check main and renderer separately
npm test             # run vitest unit tests
npm run test:ui      # run Playwright e2e tests
npm run lint         # ESLint
npm run package      # build + package to dir (no installer)
npm run dist         # build + create installers
```

## Architecture

### Layering Model

- **Skills** (`skills/*/`) — judgment: when to act, risk boundaries, human confirmation gates, failure routing. Pure Markdown; tool-neutral.
- **Workflows** (`workflows/*/`) — deterministic, readonly, script execution. Each workflow has exactly five files: `<name>.sh`, `<name>.ps1`, `schema.json`, `README.md`, `examples/sample-output.json`.
- **Adapters** (`adapters/`) — copy Skills and workflows into Codex or Claude Code user-level or project-level locations. Each adapter is a self-contained installer/uninstaller/check script; no shared library.
- **Distribution** (`distribution/`) — reviewed manifest files for declared distributions. `agent-routines.manifest.json` (v1 static format) stays at `version: 1`. `agent-routines.install-discovery.config.json` (v2) is the config-driven upgrade path.
- **Manager App** (`apps/agent-routines-manager/`) — Electron + React + Vite desktop console. Main process services in `src/main/services/`, IPC surface in `src/main/ipc.ts`, typed contracts in `src/shared/contracts.ts`, Zod schemas in `src/shared/schemas.ts`, renderer API bridge in `src/renderer/api.ts`.

### Workflow Output Contract

Both `.sh` and `.ps1` scripts emit a single JSON object:

```json
{ "ok": true, "workflow": "<name>", "cwd": "...", "os": "windows|macos|linux|unknown",
  "checks": [{"name": "...", "ok": true, "details": "..."}], "warnings": [], "errors": [] }
```

Exit 0 when `ok` is true, 1 when false, 2 for invalid arguments.

### Install Runtime Paths

| Target | Codex | Claude Code |
|---|---|---|
| User skills | `~/.codex/skills` | `~/.claude/skills` |
| Project skills | `.codex/skills` | `.claude/skills` |
| Workflow runtime | `~/.agent-routines/workflows` | `~/.agent-routines/workflows` |

### Electron App Architecture

The app uses a strict main/preload/renderer boundary. `src/main/ipc.ts` is the only file that calls `ipcMain.handle`; it delegates to services and validates every incoming payload with Zod. `src/renderer/api.ts` exposes `window.agentRoutinesApi` typed as `AgentRoutinesApi` (from `contracts.ts`). All cross-process contracts live in `src/shared/contracts.ts`; the Zod schemas are in `src/shared/schemas.ts`.

## Hard Rules

- **Workflow scripts must stay readonly**: no file writes in the inspected repository, no network, no database connections, no git mutations.
- **Parity is mandatory**: every `.sh` change needs a matching `.ps1` change in the same commit. Same checks, same JSON shape, same exit codes.
- **PowerShell stays ASCII-only and PS 5.1 compatible**: no `&&`/`||` pipeline chains, no ternary, no null-coalescing operators.
- **Every new `.sh` file needs the executable bit set in the git index**: `git update-index --chmod=+x <file>`.
- **`tests/required-paths.txt` is the single source** for both validate-structure implementations. Adding or removing a required file means updating it.
- **SKILL.md drives the catalog**: `docs/catalog.md` and `docs/catalog.zh-CN.md` are derived from the `Recommended workflows:` lines in `skills/*/SKILL.md`. Change SKILL.md first, then both catalog files. `tests/validate-docs` enforces consistency.
- **Every `docs/` file needs a `.zh-CN.md` counterpart** with equivalent content. Code, commands, paths, and names stay untranslated.
- Do not commit, push, tag, or publish without explicit human confirmation.

## Adding a Skill

1. Create `skills/<name>/SKILL.md`, `README.md`, and at least one substantive `references/` file.
2. SKILL.md frontmatter: `name` (kebab-case), `description` (one sentence), `os: cross-platform`.
3. Add the SKILL.md path to `tests/required-paths.txt`.
4. Add rows to `docs/catalog.md` and `docs/catalog.zh-CN.md` matching the `Recommended workflows:` line.
5. Decide whether the skill belongs in `distribution/agent-routines.manifest.json`.

## Adding a Workflow

1. Create `workflows/<name>/` with the five required files.
2. Copy the helper block (`json_escape`/`add_check`/`add_warning`/`add_error`/`detect_os` in Bash; `Add-Check`/`Add-Warning`/`Add-Error`/`Get-AgentRoutineOs` in PowerShell) verbatim from an existing workflow — do not fork helpers between files.
3. `schema.json` must set `"workflow": {"const": "<name>"}`.
4. Add the five file paths to `tests/required-paths.txt`.
5. Add a row to both catalog files; update any skill's `Recommended workflows:` line that should reference the new workflow.

## Distribution

The static v1 manifest (`distribution/agent-routines.manifest.json`) uses `merge` mode by default: it adds listed Skills and workflows but does not remove installed items not in the list. The v2 config-driven path (`tools/generate-install-manifest.ps1` / `.sh`) generates a desired-state plan from `distribution/agent-routines.install-discovery.config.json` and is dry-run by default.

## Releases

See `docs/release-process.md`. CHANGELOG must have a matching annotated `vX.Y.Z` git tag for every version except the newest entry. `tests/validate-changelog` enforces this. Public releases must pass `release-check -Public` and include root `SECURITY.md` and `SUPPORT.md` with Chinese counterparts.

## Durable Records

Completed significant executions are archived under `executions/YYYY/MM/YYYY-MM-DDTHHmm+ZZZZ-short-slug/` with `README.md`, `result.md`, `evidence/`, and `artifacts/`. The `archive-check` workflow validates the layout.
