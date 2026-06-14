# Electron App Execution Plan

This document defines the execution contract for a future Electron desktop app that manages Agent Routines inventory, installation discovery, manifest generation, distribution, validation, and audit records. The app is a local operator console for this repository; it must reuse the existing scripts and repository contracts instead of replacing them.

For screen layouts, visual tokens, and interaction rules, see [Electron App UI Design](electron-app-ui-design.md). For machine setup and repeatable dependency installation, see [Electron App Prerequisites](electron-app-prerequisites.md).

## Product Scope

The app name is `Agent Routines Manager`.

The MVP must include:

- Repository inventory for all `skills/*` and `workflows/*`.
- User-level and project-level installation state scanning.
- Project discovery from reviewed roots.
- Distribution policy editing.
- Install discovery config creation, editing, and validation.
- Dry-run plan generation.
- Manifest review, diff, and write.
- Explicit distribution execution.
- Post-install integrity checks.
- Repository validation gates.
- Environment diagnostics.
- Safe command execution with allowlisted commands only.
- Source-to-target drift comparison.
- Task logs and single-task write queue.
- Execution archive generation compatible with `executions/YYYY/MM/...`.
- Documentation entry points.
- Global language switching: Simplified Chinese and English.
- Theme switching: light, dark, and system.
- Windows, macOS, and Linux UI support.

## Non-Goals

- Do not create a second source of truth for Skills, workflows, manifests, or install discovery policy.
- Do not scan the whole disk.
- Do not execute arbitrary shell text supplied by the renderer.
- Do not silently enable force replacement.
- Do not commit user-level plugin, MCP, or machine-specific app settings.
- Do not treat installed folders as maintained source.

## Electron Architecture

Use the standard Electron split:

| Layer | Responsibility |
| --- | --- |
| Main process | Filesystem access, OS detection, safe command runner, task queue, native dialogs, archive writes. |
| Preload | Typed IPC bridge with a narrow allowlist. No generic shell or filesystem API. |
| Renderer | UI only: inventory, matrix, policy editor, wizard, validation, logs, settings. |
| Local store | User preferences and recent config paths. Must stay outside tracked source unless explicitly exported. |

Required security settings:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` unless a concrete Electron limitation requires otherwise.
- No remote module.
- IPC handlers must validate parameters before use.
- Commands must be selected from a repository-owned allowlist, not assembled from raw UI strings.

## Source Layout Contract

Keep the app implementation under `apps/agent-routines-manager`. Do not add Electron source files at the repository root unless they are shared repository documentation or validation scripts.

The implementation must converge on this layout:

```text
apps/agent-routines-manager/
  src/
    main/
      index.ts
      ipc.ts
      command-registry.ts
      task-queue.ts
      services/
        inventory-service.ts
        install-discovery-service.ts
        validation-service.ts
        diagnostics-service.ts
        archive-service.ts
        settings-store.ts
    preload/
      index.ts
    shared/
      contracts.ts
      schemas.ts
      i18n-keys.ts
    renderer/
      main.tsx
      App.tsx
      routes/
      components/
      i18n/
      styles/
      tests/
```

Implementation rules:

- `src/shared/contracts.ts` owns DTO names, task states, status keys, command IDs, and IPC request or response types.
- `src/shared/schemas.ts` owns runtime validation schemas, using `zod` or an equivalent already-approved runtime validator.
- Renderer code may import from `src/shared/` and `src/renderer/` only. It must not import from `src/main/`.
- Preload exposes one typed API object. It must not expose `ipcRenderer`, Node filesystem APIs, process APIs, or a generic command runner.
- Main-process services may call repository scripts, read source files, write approved app artifacts, and use native dialogs.
- `package.json` must provide `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:ui`, `check:deps`, `package`, and `dist` scripts by the time implementation is complete.
- Generated app outputs stay out of git: `node_modules/`, Playwright and Electron caches, `dist/`, `out/`, `release/`, logs, coverage, and temporary files.

## Command Integration

The app must call existing repository entrypoints:

| Operation | Windows | macOS/Linux |
| --- | --- | --- |
| Validate config | `tests\validate-install-discovery-config.ps1 -ConfigPath <path>` | `tests/validate-install-discovery-config.sh --config-path <path>` |
| Generate plan | `tools\generate-install-manifest.ps1 -ConfigPath <path>` | `tools/generate-install-manifest.sh --config-path <path>` |
| Write manifest | `tools\generate-install-manifest.ps1 -ConfigPath <path> -WriteManifest` | `tools/generate-install-manifest.sh --config-path <path> --write-manifest` |
| Apply merge | `tools\generate-install-manifest.ps1 -ConfigPath <path> -WriteManifest -Apply -ApplyMode merge` | `tools/generate-install-manifest.sh --config-path <path> --write-manifest --apply --mode merge` |
| Replace listed | `tools\generate-install-manifest.ps1 -ConfigPath <path> -WriteManifest -Apply -ApplyMode replace-listed` | `tools/generate-install-manifest.sh --config-path <path> --write-manifest --apply --mode replace-listed` |
| Sync prune | `tools\generate-install-manifest.ps1 -ConfigPath <path> -WriteManifest -Apply -ApplyMode sync-prune` | `tools/generate-install-manifest.sh --config-path <path> --write-manifest --apply --mode sync-prune` |
| Repository gates | All validators from `AGENTS.md` | All validators from `AGENTS.md` |

The renderer may preview `commandsToRun` from the plan, but execution must always route through the main-process allowlist.

### Command Allowlist Contract

The main process must register command IDs with fixed executable paths, fixed argument templates, and validated placeholders. Do not accept raw shell text from the renderer.

| Command ID | Writes | Confirmation | Arguments |
| --- | --- | --- | --- |
| `validateInstallConfig` | No | No | `configPath` |
| `generateInstallPlan` | No | No | `configPath` |
| `writeManifest` | Yes, repository manifest/report paths from generator output | Required | `configPath` |
| `applyDistribution` | Yes, install targets from reviewed manifest | Required | `configPath` |
| `destructiveApplyDistribution` | Yes, replace-listed or sync-prune target changes | Exact destructive phrase plus backup/restore plan | `configPath`, `mode`, `confirmationText`, `manifestDigest` |
| `runRepositoryGate` | No | No | `gateId`, `shell` |
| `checkInstallTarget` | No | No | `tool`, `scope`, optional `projectPath` |

Command-runner rules:

- Use argument arrays (`spawn` or `execFile`) instead of shell string concatenation.
- Run repository commands with the source repository as `cwd`.
- Resolve script paths from the selected source repository root; reject paths outside the reviewed repository or reviewed config file location.
- Normalize paths into structured values before display, but show native paths in the UI.
- Store command metadata as command ID, executable, args, cwd, shell kind, started time, ended time, duration, exit code, stdout, stderr, and cancellation state.
- Redact secrets and avoid printing full environment variables.
- Treat missing shells, missing executable bits, and absent host tools as diagnostics or platform gaps, not as reasons to silently pick a different write path.

## Data And IPC Contracts

All IPC payloads must be validated in the main process before use. Shared types should include at least:

```ts
type PlatformKind = "windows" | "macos" | "linux";
type ThemeMode = "light" | "dark" | "system";
type LanguageCode = "en" | "zh-CN";
type RoutineKind = "skill" | "workflow";
type InstallStatus = "same" | "drift" | "broken" | "missing" | "unknown" | "shared" | "not-targeted";
type TaskState = "pending" | "running" | "succeeded" | "failed" | "canceled";

interface RoutineItem {
  name: string;
  kind: RoutineKind;
  sourcePath: string;
  recommendedWorkflows: string[];
  hasRequiredFiles: boolean;
  includedByDefault: boolean;
}

interface InstallMatrixCell {
  routineName: string;
  kind: RoutineKind;
  tool: "codex" | "claude-code" | "shared-workflow-runtime";
  scope: "user" | "project";
  status: InstallStatus;
  sourcePath?: string;
  targetPath?: string;
  missingFiles: string[];
  changedFiles: string[];
}

interface TaskRecord {
  id: string;
  commandId: string;
  state: TaskState;
  startedAt?: string;
  endedAt?: string;
  exitCode?: number;
  cwd: string;
  argv: string[];
}

interface AppSettings {
  sourceRepositoryPath: string;
  activeConfigPath?: string;
  theme: ThemeMode;
  language: LanguageCode;
  recentProjectRoots: string[];
}
```

The preload API must expose named operations, not a generic `invoke(channel, payload)` wrapper. Required IPC operations:

| IPC operation | Purpose |
| --- | --- |
| `settings.get` / `settings.update` | Load and persist local app settings outside tracked source. |
| `inventory.scan` | Read source Skills, workflows, catalog metadata, and workflow recommendations. |
| `installConfig.open` / `installConfig.validate` / `installConfig.saveAs` | Work with reviewed install discovery configs. |
| `plan.generate` | Run the dry-run generator and return parsed plan JSON plus raw command evidence. |
| `manifest.write` | Write the reviewed manifest through the generator. |
| `distribution.apply` | Apply a reviewed manifest with explicit confirmation state. |
| `validation.runGate` | Run one repository validation gate or a selected safe gate group. |
| `diagnostics.run` | Check host tools, shells, executable bits, paths, and repository readability. |
| `tasks.list` / `tasks.subscribe` / `tasks.cancel` | Show queue state, stream logs, and cancel safe subprocesses. |
| `archive.write` | Write an approved execution archive after successful apply or requested dry-run evidence capture. |
| `dialogs.pickFile` / `dialogs.pickDirectory` | Use native dialogs from the main process. |
| `docs.list` / `docs.open` | Open repository docs without exposing arbitrary filesystem access. |

## Functional Modules

### Dashboard

Show repository path, active config path, active language, active theme, source inventory counts, scan status, validation status, and last task outcome.

### Inventory

List every local Skill and workflow from source. Show path, type, source completeness, default policy inclusion, and installed-state summary.

### Install Matrix

Show user-level and project-level targets across Codex, Claude Code, and shared workflow runtime paths. Status values:

- `same`: installed content matches source.
- `drift`: installed content differs from source.
- `broken`: expected files are missing.
- `missing`: policy requires the item but it is not installed.
- `unknown`: target exists but the source repository has no matching item.
- `shared`: workflow runtime is shared instead of copied per tool.
- `not-targeted`: active config does not select this routine for this target.

Clicking a cell opens source path, target path, file-level comparison, and suggested actions.

### Projects

Edit project roots, discovery depth, excluded directories, and nested repo behavior. Project discovery must follow the existing install discovery config shape.

### Policy

Edit:

- `userTargets`
- `projectDefaults`
- `projectTargets`
- `promotionRules.doNotPromoteToUserSkills`

Validate duplicate names, invalid names, and missing source folders before plan generation.

### Distribute Wizard

Use a gated flow:

1. Choose Scope
2. Select Routines
3. Review Targets
4. Apply Mode
5. Run & Verify
6. Result

`Apply` must be disabled until config validation and plan generation pass. `replace-listed` and `sync-prune` require exact confirmation phrases and backup/restore plans.

### Validation

Expose the full repository gate set from `AGENTS.md` for PowerShell and Bash. The UI must show command, shell, exit code, stdout, stderr, and duration.

### Environment Diagnostics

Check:

- Git availability.
- PowerShell availability.
- Bash availability.
- Python or `python3` availability for Bash helper paths.
- Script executable bits for `.sh` files in the git index.
- OS, shell, and path separator behavior.
- Whether the app can read the source repository and selected config file.

Diagnostics may warn, but only block when the requested operation cannot run.

### Task Center

All write or install tasks run through a single-task queue. The UI must show `pending`, `running`, `succeeded`, `failed`, and `canceled`. Long-running commands should stream logs and support cancellation when the subprocess can be terminated safely.

### Audit Archive

After a successful apply, the app should offer to write an execution archive:

```text
executions/YYYY/MM/YYYY-MM-DDTHHmm+ZZZZ-agent-routines-manager/
  README.md
  result.md
  evidence/commands.md
  artifacts/plan.json
  artifacts/manifest.json
```

Archive generation must not be automatic for dry-run tasks unless the operator requests it.

## Theme Requirements

The app must support:

- `light`
- `dark`
- `system`

Implementation rules:

- Use design tokens for color, spacing, type, border, focus, and status states.
- Persist the selected theme in local app settings.
- When `system` is selected, follow Electron `nativeTheme`.
- Do not encode status only by color; include text or icons.
- Validate contrast in both light and dark themes.
- Avoid decorative gradients, generic AI-style glow, floating blobs, oversized hero sections, and one-note palettes.

## Language Requirements

The app must support:

- Simplified Chinese
- English

Implementation rules:

- Store UI text in translation keys, not inline strings.
- Persist the selected language in local app settings.
- Use stable status keys such as `same`, `drift`, `broken`, `missing`, `unknown`, `shared`, and `not-targeted`; translate display text separately.
- Test long labels in both languages.
- Never translate filesystem paths, command names, JSON field names, or routine identifiers.

## Cross-Platform UI Requirements

The app must work on Windows, macOS, and Linux.

| Area | Requirement |
| --- | --- |
| Window chrome | Use native window behavior unless a custom title bar is necessary. |
| Menus | Provide platform-appropriate application, edit, view, and help menus. |
| Shortcuts | Use `Ctrl` on Windows/Linux and `Cmd` on macOS. |
| Paths | Display native paths but store internal paths in normalized structured values. |
| Shells | Prefer PowerShell on Windows and Bash on macOS/Linux for repository scripts. |
| File dialogs | Use native dialogs from the main process. |
| Fonts | Use system UI font stacks. |

The UI should use a mainstream productivity-tool style: compact navigation, restrained surfaces, clear tables, predictable forms, visible validation, and no decorative AI branding.

## Preferred UI Structure

Use this navigation model:

- Dashboard
- Inventory
- Install Matrix
- Projects
- Policy
- Distribute
- Validation
- Task Center
- Docs
- Settings

The Install Matrix is the primary work view. The Distribute Wizard is the safe write path. Dashboard is a summary, not a marketing landing page.

The detailed frontend layout and interaction contract is maintained in [Electron App UI Design](electron-app-ui-design.md). Implementation work should follow that document before adding route-specific UI.

## Plugin And Skill Installation Guide

Codex plugins are operator-environment capabilities. Install them at user level in Codex, not inside this repository. This repository should store execution rules, app code, tests, and distributable Agent Routines, but not user-specific plugin state.

The full reusable setup checklist is maintained in [Electron App Prerequisites](electron-app-prerequisites.md).

Recommended user-level plugins:

| Plugin or capability | Purpose | Scope |
| --- | --- | --- |
| Build Web Apps | Renderer UI implementation, frontend testing guidance, React patterns when used. | User level |
| Browser | Open and inspect local renderer/dev-server targets during UI QA. | User level |
| Chrome | Optional fallback when testing requires the user's existing Chrome profile. | User level |
| GitHub | Optional PR, issue, and CI inspection for publishing the app work. | User level |
| Codex Security | Optional security review of Electron IPC, command execution, and packaging changes. | User level |
| imagegen | UI concept images and preview mockups. | User level |
| playwright | Renderer interaction testing and screenshots when Browser is unavailable. | User level |

Project-level source guidance already maintained in this repository:

| Addition | Purpose | Scope |
| --- | --- | --- |
| This execution plan | Shared implementation contract for all agents and maintainers. | Project |
| `docs/electron-app-ui-design.md` | Frontend layout, visual tokens, screen wireframes, and interaction rules. | Project |
| `docs/electron-app-prerequisites.md` | Machine setup, plugin scope, dependency installation, and verification checklist. | Project |
| `skills/electron-app-builder` | Agent instructions for secure Electron main/preload/renderer implementation. | Source Skill, then install target |
| `skills/desktop-design-system` | Desktop productivity UI, theme tokens, dense tables, and visual QA guidance. | Source Skill, then install target |
| `skills/desktop-qa` | Renderer, native behavior, screenshot, theme, language, and task-log QA guidance. | Source Skill, then install target |
| `skills/desktop-packaging-release` | Electron packaging, signing boundaries, dry-run artifacts, and release readiness. | Source Skill, then install target |
| `skills/i18n-checklist` | English and Simplified Chinese translation key and language-switch QA. | Source Skill, then install target |

Optional future additions:

| Addition | Recommended handling |
| --- | --- |
| Figma connector | Optional user-level connector if design files are introduced. |
| Architecture decision records | Add project docs when a decision changes security, packaging, command execution, or distribution behavior. |
| CI desktop job matrix | Add only after the local app has stable build and renderer test scripts. |

Installation rule:

- Install plugins that extend Codex itself at user level.
- Add repository-specific instructions, checklists, and app code to the project.
- Promote a project-level Skill to user level only after it is useful across multiple repositories.

Suggested installation workflow:

1. Install user-level Codex plugins from the Codex plugin installation UI or the organization's approved plugin distribution path. Do not copy plugin cache directories into this repository.
2. Enable only the plugins needed for the current task. For implementation, start with Build Web Apps and Browser. Add GitHub only when PR or CI work is needed. Add Codex Security for security review passes.
3. Keep project-specific guidance in `docs/` or a project-level Skill until it has been reused across multiple repositories.
4. If a thread requests plugin installation through Codex, first list available install candidates, then request installation only for an exact plugin or connector match.
5. After installing or enabling a plugin, run the repository validation gates before relying on plugin-generated changes.

## Implementation Phases

Future agents should implement the app in these phases and stop each phase only after its exit criteria pass:

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 0. Scaffold | Vite, Electron main/preload/renderer entrypoints, TypeScript config, app scripts, empty shell UI. | App starts locally, `typecheck`, `lint`, and `test` scripts exist and run. |
| 1. Readonly model | Settings, inventory scan, install matrix scan, diagnostics, docs view, no write commands. | Renderer shows real source Skills/workflows and diagnostics without executing writes. |
| 2. Plan and validation | Config open/validate, dry-run plan generation, repository gates, command output viewer. | Dry-run plan and validation gates run through allowlisted IPC and task logs. |
| 3. Controlled writes | Manifest write, merge apply, replace-listed, sync-prune confirmation, single-task queue, cancellation, archive writer. | Write paths require confirmation and produce reviewable task evidence. |
| 4. Product UI | Install Matrix as primary view, Distribute Wizard, theme tokens, i18n, platform menus, shortcuts. | English and Simplified Chinese work without restart; light, dark, and system themes are checked. |
| 5. Release readiness | Directory packaging dry-run, artifact exclusion checks, security review, cross-platform QA notes. | Packaging remains unsigned/unpublished unless explicitly approved; release risks are documented. |

## Testing And Verification Contract

During implementation, run app-level checks from `apps/agent-routines-manager`:

```powershell
npm run check:deps
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
```

```bash
npm run check:deps
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
```

Run `npm run test:ui` only after the needed browser runtime is installed. Treat `npm audit` and browser installation failures caused by network or registry access as external blockers, not as proof that the repository implementation is broken.

Before claiming the Electron app implementation is complete, also run the full repository validation gates from `AGENTS.md`. Packaging checks should start with `npm run package` directory output; signing, notarization, uploading, tagging, publishing, and version changes require explicit human confirmation.

## Acceptance Criteria

Before implementation is considered ready:

- Light, dark, and system themes are implemented and visually checked.
- Simplified Chinese and English can be switched without restart.
- Windows, macOS, and Linux command selection is covered by tests or explicit QA notes.
- The source layout contract is implemented under `apps/agent-routines-manager`.
- Required npm scripts exist and pass, or platform-specific failures are documented with exact blockers.
- Renderer cannot execute arbitrary commands.
- IPC is allowlisted and parameter-validated.
- Plan generation remains dry-run by default.
- Merge, replace-listed, and sync-prune require explicit confirmation.
- Write commands run through a single-task queue with log streaming and cancellation where safe.
- Manifest writes, distribution apply, and archive writes produce durable review evidence.
- The full repository validation gate set passes.
- UI screenshots cover the dashboard, install matrix, distribute wizard, validation, task center, settings, light theme, and dark theme.
