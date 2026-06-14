# Electron App Distribution Guide UI

This document fixes the UI, interaction, and icon contract for Agent Routines Manager distribution v2. Implementation work must align with this spec before expanding behavior.

## Goals

- Express user-only, project-only, selected-project, and user-plus-project distribution explicitly.
- Make desired state visible before any write action.
- Keep destructive actions out of saved config; they must come from the current UI or CLI request.
- Show install status by aggregate summary and concrete project detail.
- Provide a dedicated app icon that is reviewed and packaged with the desktop build.

## Guided Distribution Flow

The Distribute page is a six-step guided workflow:

1. Choose Scope
   - Options: User only, All discovered projects, Selected projects, User + selected projects.
   - Project rows expose an enabled state and a "Keep only this project" action.
   - The step summarizes the active desired scope, not only discovered evidence.

2. Select Routines
   - Skills and Workflows are reviewed as desired content.
   - Skills can target Codex, Claude Code, or both.
   - Workflows target the shared Agent Routines runtime.
   - "Do not promote to user Skills" is a promotion rule, not a project install target.

3. Review Targets
   - Displays resolved user targets, project targets, and report-only unmanaged items.
   - Each target action is one of install, skip, replace, or prune-candidate.
   - Unclassified or unknown installed items remain report-only.

4. Apply Mode
   - dry-run only: generate and review a plan without writes.
   - merge: install missing items and skip existing targets.
   - replace-listed: replace only listed desired targets.
   - sync-prune: prune only managed, known routine targets outside desired state.
   - Confirmation phrases:
     - `APPLY`
     - `REPLACE <N> TARGETS`
     - `SYNC PRUNE <N> TARGETS`

5. Run & Verify
   - Validate config.
   - Generate manifest.
   - Review readonly Plan JSON and manifest diff.
   - Write reviewed manifest.
   - Run apply only after the selected mode has the exact confirmation phrase.

6. Result
   - Shows installed, skipped, replaced, pruned, failed, unknown, and unclassified counts.
   - Links back to Project Detail Matrix for target-level diagnosis.
   - Keeps reviewed task evidence available for the archive flow.

## Policy Page

Policy is split into four groups:

- User defaults: user-level tools, Skills, and workflows.
- Project defaults: discovered-project tools, Skills, workflows, createTargets, and sync mode.
- Project overrides: explicit per-project desired state.
- Promotion rules: Skills that must not be installed at user level.

Project-only wording must not be used for promotion rules because it implies a project install target.

## Projects Page

Projects is a discovery and override surface:

- Roots remain the discovery input.
- Discovered projects and configured project overrides show target roots and available tool folders.
- Each project can declare tools, Skills, workflows, createTargets, and mode.
- "Keep only this project" disables user defaults and project defaults, then enables the selected project override.

## Install Matrix

The Matrix has two levels:

- Summary Matrix aggregates desired targets only.
- Non-selected matrix cells show `not-targeted`; they must not reuse `shared`.
- Project Detail Matrix expands routine x project x tool.

Status aggregation uses this severity order:

`broken > unknown > drift > missing > same > shared > not-targeted`

Details must show project path, target path, action, missing files, and changed files.

## Plan JSON Safety

Plan JSON is readonly. The action table and generated manifest are the reviewed source for Apply. If the user edits text in the UI, Apply must not silently ignore it.

## App Icon

The application icon represents Agent Routines Manager: local distribution, controlled execution, and a Skills/workflows matrix.

Requirements:

- Master artwork: 1024 x 1024 PNG.
- No text, letters, watermark, mascot, or complex small details.
- Must remain recognizable at 16, 24, 32, 48, 64, 128, and 256 px.
- Windows ICO must include 16, 24, 32, 48, 64, 128, and 256 px entries.
- Deliverables:
  - `apps/agent-routines-manager/resources/icon.png`
  - `apps/agent-routines-manager/resources/icon.ico`
  - `apps/agent-routines-manager/resources/icon-source.prompt.md`

Packaging verification must confirm `electron-builder.yml` still points to `resources/icon.ico` and the packaged app uses the reviewed icon for the window, taskbar, and install directory.

## Acceptance

- Config v2 is the default model.
- v1 files can be read and migrated.
- Bash and PowerShell generators emit the same manifest shape.
- UI destructive apply is disabled on dirty config, validation failure, digest mismatch, missing backup, or bad confirmation phrase.
- Unknown and unclassified installed items are report-only.
- The final desktop package contains the reviewed app icon.
