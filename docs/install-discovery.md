# Install Discovery

Install discovery builds a reviewed desired state and an installation manifest from the source repository and the current local installation state. It is intended for machines where Agent Routines are distributed to user-level tool folders and multiple project repositories.

The generator is conservative by default:

- It never scans the whole disk.
- It scans only configured user targets and configured discovery roots.
- It writes no files unless `-WriteManifest` or `--write-manifest` is passed.
- It installs nothing unless `-Apply` or `--apply` is also passed.
- Unknown and unclassified installed items are report-only.

## Config v2

Start from `tools/install-discovery.config.example.json` and save a reviewed copy, for example:

```text
.agent-routines/install-discovery.config.json
```

For project-type starting points, use the sanitized templates in [Install Discovery Manifest Templates](install-discovery-manifest-templates.md).

Key fields:

| Field | Purpose |
| --- | --- |
| `version` | Use `2` for the current desired-state model. |
| `userTargets.enabled` | Enables or disables user-level desired targets. |
| `userTargets.tools` | User-level tools: `codex`, `claudeCode`, or both. |
| `userTargets.skills.<tool>` | Skills installed to that tool's user folder. |
| `userTargets.workflows` | Workflows installed to the shared user runtime. |
| `projectDefaults` | Default desired state for discovered projects. |
| `projectTargets[]` | Explicit per-project desired state and overrides. |
| `projectTargets[].createTargets` | Whether the generator may create missing project target folders. |
| `projectTargets[].mode` | Per-project sync mode for non-destructive desired-state planning. |
| `discovery.roots` | Reviewed roots to scan for Git repositories. |
| `discovery.maxDepth` | Maximum scan depth below each root. |
| `discovery.excludeDirs` | Directory names skipped during discovery. |
| `discovery.skipNestedRepos` | Stops traversal below a discovered Git repository when `true`. |
| `promotionRules.doNotPromoteToUserSkills` | Skills that must not be installed at user level. This is not a project install list. |
| `output.manifestPath` | Generated manifest path, resolved from the source repository root. |
| `output.reportPath` | Generated plan report path, resolved from the source repository root. |
| `applySafety.unknownInstalledItems` | Must be `report-only`. |

Config v2 must not contain `force`, `pruneUnlisted`, `defaultMode`, or destructive apply switches. Destructive behavior comes only from the current UI or CLI request.

## v1 Compatibility

v1 configs are accepted as migration input:

- `projectRoots` becomes `discovery.roots`.
- `projectDiscovery` becomes `discovery`.
- `scopePolicy.userLevelSkills` becomes `userTargets.skills`.
- `scopePolicy.userLevelWorkflows` becomes `userTargets.workflows`.
- `scopePolicy.projectDefaultWorkflows` becomes `projectDefaults.workflows`.
- `scopePolicy.projectLevelOnlySkills` becomes `promotionRules.doNotPromoteToUserSkills`.

New files should be written as v2.

## Commands

Validate config shape:

```powershell
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tests/validate-install-discovery-config.sh --config-path ./.agent-routines/install-discovery.config.json
```

Generate a dry-run plan:

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -ApplyMode dry-run
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --mode dry-run
```

Write the generated manifest and report:

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -WriteManifest -ApplyMode merge
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --write-manifest --mode merge
```

Apply after review:

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -WriteManifest -Apply -ApplyMode merge
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --write-manifest --apply --mode merge
```

Supported apply modes:

- `dry-run`: no target writes.
- `merge`: install missing items and skip existing targets.
- `replace-listed`: back up and replace listed desired targets.
- `sync-prune`: back up and prune managed known routine targets that are outside desired state.

`replace-listed` and `sync-prune` require an explicit current request and backup/restore plan.

## Manifest v2

The generated manifest contains:

- `desiredTargets[]`
- `actions[]`
- `backupPlan`
- `restorePlan`
- `unknownInstalledItems[]`
- `unclassifiedInstalledItems[]`
- `summary`

Actions are one of `install`, `skip`, `replace`, or `prune-candidate`.

Workflows are shared runtime targets. Skills are per-tool targets. Matrix cells outside the active desired state show `not-targeted`; they are not shared installs.

## Matrix Semantics

Install Matrix aggregates only desired targets. Non-selected cells remain visible as `not-targeted` so operators can distinguish them from missing installs. Project Detail Matrix expands routine x project x tool and reports the concrete project path, target path, action, changed files, and missing files.

Aggregation severity:

`broken > unknown > drift > missing > same > shared > not-targeted`

## Safety

- Plan JSON shown in the app is readonly.
- Apply is disabled when config is dirty, validation failed, digest mismatch is detected, backup is missing for destructive modes, or the confirmation phrase is wrong.
- Unknown and unclassified installed items are never pruned automatically.
- Apply runs check-install when `verifyAfterInstall` is enabled in the generated plan. Execution archives are written through the separate archive task flow.
