# Electron App Manual Test Cases

This checklist is for human testing of the local `Agent Routines Manager` Electron app. It covers the packaged local app, the development app, functional flows, UI behavior, interaction states, localization, desktop integration, and security boundaries.

## Test Target

| Item | Value |
| --- | --- |
| App | `apps/agent-routines-manager` |
| Packaged executable | `apps/agent-routines-manager/out/win-unpacked/Agent Routines Manager.exe` |
| Development command | `npm run dev` from `apps/agent-routines-manager` |
| Package command | `npm run package` from `apps/agent-routines-manager` |
| Source repository | `D:\Repositories\agent-routines` |
| Default config | `tools/install-discovery.config.example.json` |

Safety rules for manual testing:

- Do not run release publishing, signing, upload, git commit, push, or tag commands.
- Treat destructive apply modes as blocked safety paths until their exact confirmation phrase and backup requirements are satisfied.
- If testing `Save config as...`, write only to an ignored temporary path such as `.tmp/manual-test-install-discovery.config.json`, then remove it after testing.
- User-level install targets under `~/.codex`, `~/.claude`, and `~/.agent-routines` are runtime targets, not sources.

## Automation Execution Model

Use the same case IDs for human testing, Codex built-in Browser testing, and computer-control testing. A pass is complete only when the surface that owns the case records evidence.

| Surface | Use for | Entrypoint | Evidence |
| --- | --- | --- | --- |
| Shell | Dependency, build, unit, Playwright, package, and repository gates. | Commands in the regression checklist. | Command, cwd, exit code, stdout/stderr, and generated report path. |
| Codex built-in Browser | Renderer-preview flows that do not require native Electron APIs, OS dialogs, menus, or real IPC. | `npm run test:ui` or open `http://127.0.0.1:5173` after `npm run dev:renderer -- --port 5173`. | Playwright report, trace or screenshot on failure, and Browser screenshot for visual checks. |
| Computer control | Packaged or development Electron window behavior, native menus, native dialogs, DevTools, OS browser handoff, restart, and window resizing. | `npm run package`, then launch `out/win-unpacked/Agent Routines Manager.exe`, or run `npm run dev`. | Native-window screenshots, action log, command output, and cleanup notes. |

Automation rules:

- Prefer accessible roles, labels, placeholders, and visible headings over brittle coordinates or CSS-only selectors.
- Browser-preview automation must assert the `Browser preview` chip and must not claim coverage for native IPC, native menus, native dialogs, packaged navigation guards, or OS browser handoff.
- Computer-control automation may click native UI and dialogs, but must not approve release publishing, signing, upload, git commit, push, tag, `Apply`, `replace-listed`, or `sync-prune`.
- Full automation means every case is either executed by shell, Codex built-in Browser, or computer control, or is explicitly marked not applicable for that host with a concrete reason.

Full automation run contract:

- Execute in three ordered batches: shell setup and packaging, Codex built-in Browser renderer-preview automation, then computer-control native Electron automation.
- Each case result must be one of `passed`, `failed`, `skipped-not-applicable`, or `blocked`.
- Each recorded result must include case ID, surface, timestamp, command or native window, assertion summary, artifact path, and cleanup status.
- A Browser-preview pass must include the `Browser preview` marker in evidence and must not be used as proof for native menu, IPC, OS dialog, or packaged-app behavior.
- A computer-control pass must use a packaged or development Electron window titled `Agent Routines Manager` and must not click through destructive confirmations unless the case explicitly says to test the disabled or rejected state.
- End each full run by closing test-launched app processes, stopping the renderer dev server, removing `.tmp/manual-test-install-discovery.config.json`, and recording whether install targets changed.

Automation selector contract:

| Target | Preferred selector or anchor | Notes |
| --- | --- | --- |
| Primary navigation | Navigation landmark plus exact visible route label. | Works in Browser preview and computer control; route labels may be English or Simplified Chinese. |
| Global search | Placeholder `Search routines, docs, tasks...` or `搜索 routines、文档、任务...`. | Preserve entered value while changing searchable routes. |
| Matrix search | Placeholder `Search routines or targets...` or `搜索 routines 或目标...`. | Use with kind, tool, and status filters. |
| Docs search | Placeholder `Search docs...` or `搜索文档...`. | Must not become a generic filesystem search. |
| Distribution Plan JSON | Visible label `Plan JSON`. | The control must be readonly and used only for review evidence. |
| Manifest diff | Visible label `Manifest diff`. | Use for write-manifest review, not as the source of truth for Apply. |
| Apply confirmation | Confirmation input label plus exact phrase shown by the selected mode. | Negative tests should enter close but incorrect phrases. |
| Native window | Window title `Agent Routines Manager`. | Required for computer-control launch, restart, resize, menu, and DevTools cases. |
| Native dialogs | Dialog title, filename field, and selected directory breadcrumb. | Save only under `.tmp/` unless the case tests a rejected target. |
| Icon evidence | Window chrome, taskbar, packaged executable, and `resources/icon.ico` size check. | Use screenshot evidence where the host exposes icon surfaces. |

## Automation Coverage Map

| Case range | Primary automation | Secondary automation | Notes |
| --- | --- | --- | --- |
| ENV-001..ENV-003 | Shell | Computer control for packaged output inspection | Package generation is allowed; signing, upload, tag, and publish remain out of scope. |
| ENV-004..ENV-010 | Computer control | Shell for launch diagnostics | Requires a real Electron window, package metadata, app user-data behavior, and process cleanup. |
| SHELL-001..SHELL-007, SHELL-009 | Codex built-in Browser | Computer control | Browser preview covers navigation, search, keyboard behavior, layout, overflow, and responsive behavior. |
| SHELL-008 | Computer control | None | Native menu behavior is outside Browser preview. |
| DASH, INV, MAT, POL, DIST, VAL, TASK, DOC, SET visual flows | Codex built-in Browser | Computer control | Browser preview uses deterministic fixture data and is the fastest regression surface. |
| PROJ save/open dialog paths | Computer control | Browser preview for draft validation only | Native file dialogs and real save guards require Electron IPC. |
| SEC-001..SEC-010 | Computer control | Browser preview for global-exposure smoke only | Packaged navigation, webview, external link, digest tamper, and IPC checks require Electron runtime. |
| VIS-001..VIS-010 | Codex built-in Browser | Computer control | Browser covers fixed viewports; computer control covers native zoom, screenshots, icons, and window chrome. |

## Environment And Launch

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| ENV-001 | Dependency install | Run `npm ci` in `apps/agent-routines-manager` if `node_modules` is absent. | Dependencies install from `package-lock.json` without changing dependency manifests. |
| ENV-002 | Dependency metadata | Run `npm run check:deps`. | Command exits `0` and lists only the expected top-level dependencies. |
| ENV-003 | Local package | Run `npm run package`. | `out/win-unpacked/Agent Routines Manager.exe` is generated; no signing, upload, tag, or publish action runs. |
| ENV-004 | Packaged launch | Open `out/win-unpacked/Agent Routines Manager.exe`. | A native Electron window opens with title `Agent Routines Manager` and the Install Matrix screen. |
| ENV-005 | Development launch | Run `npm run dev`. | Vite starts on `127.0.0.1:5173`, Electron opens, and closing the Electron window stops the dev helper. |
| ENV-006 | App restart | Close and reopen the packaged app. | App opens without a crash and reloads local settings from Electron user data. |
| ENV-007 | Repository defaults | On first launch or after clearing app user data, inspect the path chips. | Source repository resolves to the local checkout and active config resolves to `tools\install-discovery.config.example.json`. |
| ENV-008 | Browser preview launch | Run `npm run dev:renderer -- --port 5173` and open `http://127.0.0.1:5173` in the Codex built-in Browser. | Browser preview loads with fixture data, shows the `Browser preview` chip, and does not expose Electron IPC globals. |
| ENV-009 | Process cleanup | After a Browser or computer-control test run, close the window and stop the dev server. | No test-owned Electron process or `127.0.0.1:5173` listener remains; cleanup is recorded as evidence. |
| ENV-010 | App icon assets | Inspect `resources/icon.png`, `resources/icon.ico`, `electron-builder.yml`, and packaged output. | PNG and ICO are non-empty; ICO includes 16, 24, 32, 48, 64, 128, and 256 sizes; packaged app uses `resources/icon.ico`. |

## App Shell And Navigation

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| SHELL-001 | Initial route | Launch the app. | `安装矩阵` / `Install Matrix` is the first work view, not a landing page. |
| SHELL-002 | Sidebar | Click every sidebar item: Dashboard, Inventory, Install Matrix, Projects, Policy, Distribute, Validation, Task Center, Docs, Settings. | Each route changes the heading and renders a real view without placeholder copy. |
| SHELL-003 | Header actions | Visit Dashboard, Install Matrix, Projects, Policy, Distribute, and Settings. | Header actions match route scope: refresh/diagnostics, open wizard, validate/save, generate plan, or diagnostics. |
| SHELL-004 | Status bar | Watch the bottom status bar during refresh, diagnostics, and gate runs. | It shows action status, config state, task state, and shell labels without covering content. |
| SHELL-005 | Path chips | Hover over repository and config path chips. | Full path is available as tooltip; visible text uses middle truncation when needed. |
| SHELL-006 | Global search field | Type a known routine name such as `desktop-qa` in the top search. | Current searchable views filter or preserve the value consistently; no layout jump occurs. |
| SHELL-007 | Window size | Resize to `1360 x 900` and `1024 x 720`. | Text remains readable, no incoherent overlap appears, and the main document does not scroll horizontally. |
| SHELL-008 | Native menu | Use View reload and zoom controls from the native menu. | The app reloads or zooms using normal Electron menu behavior. |
| SHELL-009 | Keyboard route recovery | Use keyboard focus to move through navigation, search, and the active route controls after a reload. | Focus order remains logical, visible focus is preserved, and the current route can recover without pointer input. |

## Dashboard

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| DASH-001 | Summary counts | Open Dashboard after initial refresh. | Inventory and workflow counts match the current source folders under `skills/` and `workflows/`. |
| DASH-002 | Readiness checklist | Inspect the readiness panel. | Repository readable, refresh state, diagnostics state, and config reviewed state are visible with icon plus text. |
| DASH-003 | Diagnostics action | Click `Run diagnostics` or `Rerun diagnostics`. | Button shows busy feedback; diagnostics finish with Git, Node, npm, PowerShell, Bash, Python, Python 3, and `.sh executable bit` lines. |
| DASH-004 | Activity feed | Run diagnostics, then return to Dashboard. | Recent activity shows the diagnostics task and latest refresh state. |
| DASH-005 | Install Matrix shortcut | Click the Install Matrix action from Dashboard. | App navigates to Install Matrix without losing current search/theme/language state. |

## Inventory

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| INV-001 | Source inventory | Open Inventory. | Every source Skill and workflow is listed once. Names match folder names and are not translated. |
| INV-002 | Required files | Inspect Skill and workflow rows. | Complete routines show `complete`; broken routines, if any, show `broken` and missing file context. |
| INV-003 | Recommended workflows | Inspect Skills with `Recommended workflows:` in `SKILL.md`. | Recommended workflow names match source `SKILL.md` lines. |
| INV-004 | Search filtering | Type `runtime` in the top search. | Inventory rows filter to matching routine names and clear correctly when search is emptied. |
| INV-005 | Language stability | Switch English and Simplified Chinese while on Inventory. | UI labels change; routine names, paths, and command identifiers do not translate. |

## Install Matrix

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| MAT-001 | Matrix columns | Open Install Matrix. | Columns appear for Codex user, Codex project, Claude user, Claude project, and shared workflow runtime. |
| MAT-002 | Matrix rows | Compare visible rows with source inventory count. | Row count equals current Skill plus workflow count when no filters are active. |
| MAT-003 | Status summary | Inspect legend and summary pills. | `same`, `drift`, `broken`, `missing`, `unknown`, `shared`, and `not-targeted` appear with icon plus translated text and counts. |
| MAT-004 | Kind filter | Select Skills, then Workflows, then All routines. | Rows update to matching routine kind; clearing returns full count. |
| MAT-005 | Tool filter | Select Codex, Claude Code, and Shared runtime filters. | Visible columns and cell count update without breaking selected-cell details. |
| MAT-006 | Status filter | Select each status with at least one matching cell. | Rows show routines that contain the selected status in the visible columns. |
| MAT-007 | Search filter | Search `electron-app-builder`, then clear. | Only matching routine rows remain; clearing restores previous filter result. |
| MAT-008 | Cell selection | Click a matrix status cell. | Right detail drawer updates routine name, source path, target path, status, changed files, missing files, and recommendations. |
| MAT-009 | Routine selection | Click a routine name cell. | Detail drawer selects the first target for that routine and remains coherent. |
| MAT-010 | Shared and non-targeted targets | Select a workflow row under non-workflow-runtime columns and a Skill row under workflow runtime. | Workflow tool columns show `shared`; Skill workflow runtime cells show `not-targeted`; neither shows a misleading install path. |
| MAT-011 | Copy path | Click copy buttons in the detail drawer. | Button gives copied feedback; empty, shared, or non-targeted values do not error. |
| MAT-012 | Open docs | Click `Open` in the detail drawer. | App navigates to Docs and selects the routine README or Skill instruction entry. |
| MAT-013 | Generate plan shortcut | Click `Generate dry-run plan` from the drawer. | App navigates to Distribute; plan generation still obeys config validity and dirty-state gates. |
| MAT-014 | Refresh | Click Refresh on Install Matrix. | Button shows busy feedback and matrix data refreshes as readonly data. |
| MAT-015 | Summary and project detail | Switch between summary matrix and project detail, or open the project detail drawer for a desired routine. | Summary aggregates only desired targets; detail identifies concrete project path, tool, target path, action, and status. |
| MAT-016 | Unmanaged visibility | Load a fixture with unknown or unclassified installed items. | Unknown and unclassified entries are visible as report-only findings and are not counted as desired target success. |
| MAT-017 | Most severe rollup | Use fixture data containing broken, drift, missing, unknown, and same statuses for one routine. | Summary rollup uses `broken > drift > missing > unknown > same` across desired targets only. |

## Projects

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| PROJ-001 | Initial config | Open Projects. | Current project roots, max depth, nested repo mode, and excluded directories load from active config. |
| PROJ-002 | Add root | Enter `D:\Workbench` in Add root and click Add root. | Root appears, dirty badge shows a valid modified config, and plan generation is blocked until saved. |
| PROJ-003 | Edit root | Edit an existing root field. | Validation runs against the draft and the dirty state is visible. |
| PROJ-004 | Remove root | Remove a root with the trash button. | Row is removed from the draft; validation updates immediately. |
| PROJ-005 | Depth input | Change discovery depth within the allowed range. | Value updates without text overflow; invalid browser-native number states are visibly constrained. |
| PROJ-006 | Nested repo toggle | Toggle a root between skip and include. | Segmented control changes state and updates the draft root option. |
| PROJ-007 | Add exclude | Add `tmp-manual-test` to excluded directories. | Token is added and can be removed with its remove button. |
| PROJ-008 | Duplicate validation | Add a duplicate project root or duplicate exclude entry. | Validation messages show `duplicate` with the exact field path; Distribute plan generation is blocked. |
| PROJ-009 | Validate active config | Click `Validate config`. | A task is created and the Task Center can show command, cwd, stdout/stderr, and final status. |
| PROJ-010 | Save as cancel | Click `Save config as...` and cancel the native dialog. | No config path changes and no file is written. |
| PROJ-011 | Save as temp | Save to `.tmp/manual-test-install-discovery.config.json`. | File is written inside the repository but outside install targets; active config path updates; dirty state clears. |
| PROJ-012 | Project overrides | Inspect the project overrides list. | Each `projectTargets[]` entry shows path, enabled state, tools, selected routines, `createTargets`, and sync mode. |
| PROJ-013 | Keep only this project | Use `Keep only this project` on a disposable project override. | Draft keeps that project enabled, disables unrelated project/user default scope for the distribution draft, and remains valid but dirty until saved. |
| PROJ-014 | Missing project with `createTargets=false` | Point a disposable project override at a missing target root with `createTargets` disabled and generate a plan. | Planner reports missing targets without creating directories or writing install files. |
| PROJ-015 | Disposable project with `createTargets=true` | Use a temporary project directory and enable `createTargets`, then generate a dry-run plan. | Plan shows create/install actions only in review output; no target directory is written before Apply. |

## Policy

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| POL-001 | Policy sections | Open Policy. | User-level Skills, Do not promote to user Skills, User Workflows, and Project Workflows sections are visible. |
| POL-002 | Checkbox selection | Check and uncheck a routine in each section. | Selected strip updates and draft validation reruns. |
| POL-003 | Move selected | Use move up/down on selected policy tokens. | Ordering changes; boundary buttons are disabled at first and last positions. |
| POL-004 | Source status | Inspect routine rows. | Each routine has complete/broken status with icon plus text. |
| POL-005 | Validation panel | Create a duplicate or missing-source condition if possible from the draft. | Validation panel shows exact field paths; plan generation is blocked until fixed and saved. |
| POL-006 | Save policy draft | Save a modified policy draft to the temporary config path. | Saved config is valid JSON and active config path updates. |
| POL-007 | Promotion rule wording | Inspect `Do not promote to user Skills` or equivalent promotion rule section. | It is described as a user-level promotion constraint, not as a project install target. |
| POL-008 | User defaults versus project defaults | Select a Skill or workflow for user defaults and a different one for project defaults. | Draft preserves separate desired-state scopes and does not silently move routines between user and project targets. |
| POL-009 | Project-specific override | Select a routine for one project override only. | Review output later resolves it only for that project, not all discovered projects. |

## Distribute

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| DIST-001 | Initial wizard | Open Distribute with a clean valid config. | Stepper shows Choose Scope, Select Routines, Review Targets, Apply Mode, Run & Verify, and Result; gate checklist is visible. |
| DIST-002 | Generate dry-run plan | Click `Generate dry-run plan`. | Task runs through the allowlisted generator; Plan JSON appears; Task Center receives a generate plan task. |
| DIST-003 | Dirty config block | Modify Projects or Policy without saving, then open Distribute. | Generate plan is disabled and the dirty-config reason is visible. |
| DIST-004 | Invalid config block | Create a duplicate config entry, then open Distribute. | Generate plan is disabled and invalid-config or validation issue is visible. |
| DIST-005 | Apply disabled | Inspect `Apply`. | It remains disabled with the safety tooltip/reason. |
| DIST-006 | Destructive modes guarded | Select `replace-listed` or `sync-prune`. | Apply remains disabled until the exact confirmation phrase and backup requirements are satisfied. |
| DIST-007 | Plan persistence | Generate a plan, navigate away, and return. | Plan output remains visible for the current session unless invalidated by config edits. |
| DIST-008 | No silent writes | Generate a dry-run plan and inspect git status. | No source or install target file is modified by plan generation. |
| DIST-009 | Apply mode phrases | Select `dry-run`, `merge`, `replace-listed`, and `sync-prune`. | Required confirmation text changes to no write, `APPLY`, `REPLACE <N> TARGETS`, or `SYNC PRUNE <N> TARGETS` as appropriate. |
| DIST-010 | Merge confirmation | Generate a manifest with missing targets, choose `merge`, and enter `APPLY`. | Apply can enable only for merge-safe install actions; existing targets remain skip actions. |
| DIST-011 | Replace confirmation negative | Choose `replace-listed`, enter a legacy force-style phrase or the wrong target count. | Apply remains disabled or rejected; only the exact `REPLACE <N> TARGETS` phrase can pass. |
| DIST-012 | Sync-prune confirmation negative | Choose `sync-prune`, enter the wrong phrase or run without backup and restore plan. | Apply remains disabled or rejected; prune candidates stay review-only until safeguards exist. |
| DIST-013 | Digest mismatch block | Generate a manifest, change config or manifest input, then attempt to apply the stale plan. | Apply is blocked with a digest or stale-plan reason and requires regeneration. |
| DIST-014 | Plan invalidation | Generate a plan, edit Projects or Policy, and return to Distribute. | Write manifest and Apply actions are disabled until the plan is regenerated from the saved config. |
| DIST-015 | Dry-run only mode | Select dry-run only and proceed through Run & Verify. | Only validation and plan output run; no install, replace, prune, or target write occurs. |
| DIST-016 | Unknown report-only | Generate a plan with unknown or unclassified installed items. | They appear in review and result summaries as report-only; no mode offers to prune them automatically. |

## Validation

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| VAL-001 | Gate list | Open Validation. | Both PowerShell and Bash rows exist for the AGENTS gate set: structure, skills, workflows, docs, changelog, manifest, install discovery config, run-workflows. |
| VAL-002 | Select gate | Click a gate row name. | Output pane shows the command preview for that gate. |
| VAL-003 | Run PowerShell gate | Run `validate-structure` PowerShell. | Task status becomes succeeded or failed with exact stdout/stderr; no write operation occurs. |
| VAL-004 | Run Bash gate | Run a Bash gate when Bash is available. | Task status and output reflect the real shell result; missing Bash is reported as a platform gap or failed command evidence. |
| VAL-005 | Manifest arguments | Select `validate-manifest`. | Command preview includes the repository manifest path argument. |
| VAL-006 | Install config arguments | Select `validate-install-discovery-config`. | Command preview includes the active example config argument. |
| VAL-007 | Task handoff | After running a gate, open Task Center. | The same gate task appears with command metadata and output. |
| VAL-008 | Repeated run | Run the same gate twice. | New evidence appears without corrupting or duplicating unrelated task rows. |
| VAL-009 | Missing opposite shell classification | On a controlled host without Bash or PowerShell, run the unavailable-shell gate. | UI records the failure or platform gap with exact command evidence and does not mislabel unrelated repository checks as failed. |
| VAL-010 | Gate selection persistence | Select one gate, run another, navigate away, and return. | The selected output remains coherent and never shows stdout/stderr from a different gate as if it were current. |

## Task Center

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| TASK-001 | Empty state | Open Task Center before running tasks. | Empty state is clear and does not look broken. |
| TASK-002 | Queue rows | Run diagnostics, plan generation, or a validation gate, then open Task Center. | Queue shows task title and state. |
| TASK-003 | Log inspector | Select each task row. | Log pane shows argv, stdout, stderr, cwd, and final state where available. |
| TASK-004 | Failed command evidence | Run a gate expected to fail or use a missing shell on a controlled test host. | Failed state preserves stderr and non-zero exit code. |
| TASK-005 | Redaction spot check | If a command output contains token-like text in a controlled fixture, inspect Task Center. | Secret-like values are redacted in displayed logs. |
| TASK-006 | Persistence boundary | Restart the app. | In-memory task queue is cleared unless future local persistence is explicitly implemented. |
| TASK-007 | Cancellation safety | Start a long-running validation or diagnostics task where cancellation is available. | Only running cancelable tasks expose cancel; completed tasks cannot be canceled retroactively. |
| TASK-008 | Archive evidence | If execution archive writing is exposed, run it for a completed apply or verification task. | Archive output is a separately confirmed action and records README/result/evidence/artifact paths without changing install targets. |

## Docs

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| DOC-001 | Docs list | Open Docs. | Whitelisted docs appear, including Electron plan, UI design, prerequisites, manual test cases, install discovery, release process, README entries, and routine docs. |
| DOC-002 | Preview | Select `Electron App Manual Test Cases`. | Preview shows headings, summary, file path, and body preview. |
| DOC-003 | Routine docs | Select a Skill README and a Skill instruction entry. | Preview content and headings match the source files. |
| DOC-004 | Workflow docs | Select a workflow README. | Preview content and headings match the source workflow file. |
| DOC-005 | Open document | Use a docs open action where available. | The app opens only allowlisted docs through the OS, and Task Center records success or the OS error. |
| DOC-006 | Path safety | Try to infer or request arbitrary filesystem paths through the UI. | UI exposes only known docs entries, not a generic file browser. |
| DOC-007 | Distribution guide docs | Search for the distribution guide UI document in English and Simplified Chinese. | Both language entries are available from the whitelist and preview the current guided distribution flow. |
| DOC-008 | Manual test doc sync | Select this manual test document in both languages. | Case IDs are aligned across languages; no English-only or Chinese-only case IDs appear. |

## Settings, Theme, And Language

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| SET-001 | Theme light | Open Settings and select Light. | Theme changes immediately; `html[data-theme="light"]` behavior is visible in the UI. |
| SET-002 | Theme dark | Select Dark. | Theme changes immediately; contrast remains readable and status colors remain distinguishable. |
| SET-003 | Theme system | Select System. | Theme follows the host preference on restart or Electron native theme changes. |
| SET-004 | Theme persistence | Select Dark, restart the app. | Dark theme remains selected. |
| SET-005 | Language English | Select English. | Headings and labels switch to English without restart. |
| SET-006 | Language Simplified Chinese | Select Simplified Chinese. | Headings and labels switch back without restart. |
| SET-007 | Language persistence | Select English, restart the app. | English remains selected. |
| SET-008 | Path copy | Click copy buttons for repository and active config paths. | Copied feedback appears; no visible error occurs if clipboard permission is restricted. |
| SET-009 | Runtime diagnostics | Run diagnostics from Settings. | Runtime readiness list updates with exact command output details. |
| SET-010 | System theme change | With System selected, change the OS theme or simulate the native theme event. | App follows the new native theme without losing route, search, or draft form state. |
| SET-011 | Language during dirty draft | Create a dirty Projects or Policy draft, switch language, and return. | Draft state, validation issues, and disabled action reasons persist across language changes. |

## Desktop Integration And Security

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| SEC-001 | Context isolation | Open DevTools and inspect `window.agentRoutines`, `window.require`, and `window.process`. | Only the typed `agentRoutines` API is exposed; Node APIs are not directly available in the renderer. |
| SEC-002 | IPC shape | In DevTools, inspect keys of `window.agentRoutines`. | Named API groups exist; there is no generic `invoke` or shell execution function. |
| SEC-003 | Navigation guard | Try opening an arbitrary local file or changing `window.location` to a non-dev external URL. | App blocks unexpected navigation in the packaged app. |
| SEC-004 | External links | Click any external link if present in docs preview. | External URLs open through the OS browser and do not navigate the Electron renderer. |
| SEC-005 | Webview blocked | Confirm the UI never creates a webview and DevTools cannot attach one through app content. | Webview attachment is prevented by the main process. |
| SEC-006 | Save target guard | Try saving a config inside `.codex`, `.claude`, or `.agent-routines`. | Save is rejected because install target directories are not source locations. |
| SEC-007 | Command allowlist | Trigger validate config, generate plan, and validation gate runs. | Commands use fixed executable and argument arrays from the main process allowlist. |
| SEC-008 | No apply bypass | Look for any route, menu, or DevTools-exposed UI command that can run Apply without confirmation. | No bypass exists; merge, replace-listed, and sync-prune require explicit confirmation. |
| SEC-009 | Manifest tamper block | Tamper with a generated manifest or replay a stale manifest through any exposed apply path. | Apply is blocked by digest or reviewed-manifest mismatch; the app does not execute unreviewed JSON text. |
| SEC-010 | Install target non-source rule | Inspect all browse, save, open, and apply surfaces. | Runtime targets under `.codex`, `.claude`, and `.agent-routines` are never treated as authoritative source repositories. |

## Visual, Interaction, And Accessibility Pass

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| VIS-001 | Text fit | Inspect every route at `1360 x 900` and `1024 x 720`. | No button, pill, table cell, or drawer text overlaps incoherently. |
| VIS-002 | Status accessibility | Inspect status pills in light and dark themes. | Every status has icon plus text, not color alone. |
| VIS-003 | Keyboard focus | Use Tab through the active route. | Focus ring is visible and follows a logical order. |
| VIS-004 | Form controls | Use keyboard to edit Projects and Policy controls. | Inputs, checkboxes, segmented controls, and buttons are keyboard reachable. |
| VIS-005 | Copy feedback | Use copy buttons in paths and drawers. | Feedback appears and does not resize surrounding layout badly. |
| VIS-006 | Busy states | Refresh, diagnostics, and gate execution. | Buttons show busy/disabled states and recover after completion. |
| VIS-007 | Long paths | Use a long repository/config path if available. | Paths are middle-truncated with tooltip/copy behavior and do not overflow. |
| VIS-008 | Command output | Run a verbose gate. | Output pane remains readable and scrollable; status bar stays visible. |
| VIS-009 | Screenshot crop | Capture screenshots at `1280 x 720`, `1360 x 900`, and a narrow desktop width. | Primary content, route heading, status bar, and active drawer/dialog remain visible and not cropped by fixed-position UI. |
| VIS-010 | Icon readability | Inspect app icon at 16, 24, 32, 48, 128, and 256 pixel sizes. | Icon remains recognizable at small sizes and does not rely on tiny text or low-contrast details. |

## Codex Built-In Browser Automation Cases

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| BROW-001 | Browser preview marker | Open `http://127.0.0.1:5173` through the Codex built-in Browser or run `npm run test:ui`. | `Browser preview` is visible, the app starts on Install Matrix, and fixture data loads without Electron IPC. |
| BROW-002 | Global exposure boundary | Evaluate `window.agentRoutines`, `window.require`, and `window.process` in Browser preview. | All three are unavailable to renderer content; preview uses the local fallback API module instead. |
| BROW-003 | Responsive default viewport | Run the `browser-default-chromium` Playwright project or inspect at `1280 x 720`. | No horizontal document overflow appears; topbar and path chips do not collide. |
| BROW-004 | Config invalid block | Add a duplicate project root such as `D:\Work\Projects`, then open Distribute. | Draft validation shows `duplicate` and Distribute blocks plan generation. |
| BROW-005 | Policy edit ordering | Add `api-sync` to User-level Skills and move it upward. | Selected policy strip updates, move buttons obey boundaries, and draft remains valid. |
| BROW-006 | Plan editor safety | Generate a dry-run plan and inspect Plan JSON. | Plan JSON is readonly; Apply uses the generated manifest and selected mode confirmation. |
| BROW-007 | Task evidence handoff | Run a validation gate in Browser preview, then open Task Center. | Task Center shows command metadata and `Browser preview task evidence.` output. |
| BROW-008 | Docs whitelist | Search docs for a known routine and for a non-existent arbitrary path. | Known docs filter correctly; arbitrary paths do not create a file browser or dynamic filesystem access. |
| BROW-009 | Route sweep | In Browser preview, visit every primary route with default fixture data. | Each route renders a real working view, no placeholder page appears, and no console error is introduced. |
| BROW-010 | Matrix filters and drawer | Combine matrix search, kind, tool, and status filters, then open a detail drawer. | Filter state remains stable and drawer content matches the selected visible row/cell. |
| BROW-011 | Guided dry-run flow | Walk through all six Distribute steps with fixture data and generate a dry-run plan. | Stepper state, action table, readonly Plan JSON, and result summary remain coherent without native IPC. |
| BROW-012 | Destructive phrase rejection | In Browser preview, try legacy force-style wording, wrong counts, and wrong casing for destructive modes. | UI rejects incorrect phrases and never marks destructive Apply as safe. |
| BROW-013 | Dirty draft block | Edit Projects or Policy, then navigate to Distribute without saving. | Generate, write manifest, and Apply controls stay disabled with a dirty-config reason. |
| BROW-014 | Docs distribution guide | Search Docs for the distribution guide UI and manual test cases. | Both documents are visible, previewable, and filtered without arbitrary filesystem access. |
| BROW-015 | Responsive sweep | Capture Browser screenshots at `1280 x 720`, `1360 x 900`, and `1024 x 720`. | No document-level horizontal overflow, clipped toolbar, or overlapping long text appears. |
| BROW-016 | Keyboard-only sweep | Use Tab, Shift+Tab, Enter, Space, and Escape through navigation, filters, drawers, and dialogs. | Focus remains visible, dialogs can be dismissed, and controls do not trap focus unexpectedly. |
| BROW-017 | No native coverage claim | Verify `window.agentRoutines` is unavailable and the preview chip is visible before recording Browser results. | Evidence explicitly states Browser preview cannot validate native IPC, menus, dialogs, or packaged navigation. |
| BROW-018 | Fixture reset | Reset fixture-backed state between two Browser runs. | The second run starts from deterministic defaults and is not contaminated by prior draft edits. |

## Computer-Control Automation Cases

| ID | Area | Steps | Expected result |
| --- | --- | --- | --- |
| CTRL-001 | Packaged launch | Use computer control to launch `out/win-unpacked/Agent Routines Manager.exe`. | A native window appears, title is `Agent Routines Manager`, and the first view is Install Matrix. |
| CTRL-002 | Native menu | Use the Electron View menu for reload, zoom in, zoom out, and reset zoom. | Native menu actions affect the app without crashing or corrupting route state. |
| CTRL-003 | Native save cancel | Open Projects, click `Save config as...`, and cancel the save dialog. | No file is written and the active config path remains unchanged. |
| CTRL-004 | Native save guard | Attempt to save a config under `.codex`, `.claude`, or `.agent-routines`. | Save is rejected by the app service and install targets remain untouched. |
| CTRL-005 | External handoff | From a docs preview with an external link, click the link. | The URL opens through the OS browser; the Electron renderer does not navigate away. |
| CTRL-006 | DevTools security smoke | Open DevTools from the native menu and inspect renderer globals. | Typed `window.agentRoutines` exists only in Electron; direct Node globals remain unavailable. |
| CTRL-007 | Restart persistence | Change theme and language, close the app, and reopen it. | Settings persist through Electron user data; task queue remains in-memory only unless implemented later. |
| CTRL-008 | Window bounds | Resize, maximize, restore, and test at a narrow desktop width. | Navigation, status bar, drawers, dialogs, and long paths remain usable without incoherent overlap. |
| CTRL-009 | Icon surfaces | Inspect native window chrome, taskbar icon, executable icon, and app resources after packaging. | All visible icon surfaces use the reviewed app icon or are marked host-not-observable with screenshot evidence. |
| CTRL-010 | Packaged smoke duration | Leave the packaged app open for at least one minute while navigating routes and opening drawers. | App remains responsive and does not spawn uncontrolled child processes. |
| CTRL-011 | Native save to temp | Use the native save dialog to save config under `.tmp/manual-test-install-discovery.config.json`. | File is written only under `.tmp/`, active config path updates, and cleanup removes the temp file after the run. |
| CTRL-012 | Native save rejected path | Use the native save dialog to target `.codex`, `.claude`, or `.agent-routines`. | App rejects the save with a visible error and leaves the target directory unchanged. |
| CTRL-013 | Manifest digest guard | Generate a plan, then modify config and attempt to apply from the stale review. | Native Electron path blocks Apply and reports stale or digest mismatch state. |
| CTRL-014 | External link handoff | Click an external docs link from the packaged app. | OS browser receives the URL; Electron renderer stays inside the app route. |
| CTRL-015 | Native reload recovery | Reload from the native menu while on Projects, Policy, and Distribute. | App reloads without crashing, restores persisted settings, and does not silently apply unsaved draft changes. |
| CTRL-016 | Destructive confirmation negative | In the native app, select replace or sync-prune and enter an incorrect phrase. | Apply remains disabled or rejected; no backup, replace, or prune operation runs. |
| CTRL-017 | App restart with config path | Save a temp config, restart, then restore the default config. | App loads the persisted temp config path, then returns to the repository default after explicit restore. |
| CTRL-018 | Native cleanup | Close all windows and stop any dev helper processes after computer-control automation. | No test-owned Electron or Vite process remains; cleanup notes include temp file and install-target status. |

## Automation Evidence Checklist

Record these artifacts for a fully automated pass:

- Shell transcript for `npm run test:ui`, `npm run package`, and repository validation gates.
- Playwright report or trace directory for Browser-preview failures.
- Codex built-in Browser screenshot for the `1280 x 720` default viewport.
- Computer-control screenshots for packaged launch, icon surfaces, native menu, save-dialog cancel, DevTools security smoke, destructive confirmation rejection, and restart persistence.
- Cleanup note confirming temporary config files under `.tmp/` were removed and install targets were not modified.
- Machine-readable result log with case ID, surface, result, assertion summary, artifact paths, cleanup status, and not-applicable reasons where relevant.

## Regression Gate Checklist

Run these automated checks before accepting the manual test pass:

```powershell
Set-Location apps\agent-routines-manager
npm run check:deps
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
npm run package
Set-Location ..\..
.\tests\validate-structure.ps1
.\tests\validate-skills.ps1
.\tests\validate-workflows.ps1
.\tests\validate-docs.ps1
.\tests\validate-changelog.ps1
.\tests\validate-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\tools\install-discovery.config.example.json
.\tests\run-workflows.ps1
```

```bash
cd apps/agent-routines-manager
npm run check:deps
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
npm run package
cd ../..
./tests/validate-structure.sh
./tests/validate-skills.sh
./tests/validate-workflows.sh
./tests/validate-docs.sh
./tests/validate-changelog.sh
./tests/validate-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
./tests/validate-install-discovery-config.sh --config-path ./tools/install-discovery.config.example.json
./tests/run-workflows.sh
```
