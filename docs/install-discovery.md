# Install Discovery

Install discovery builds an installation manifest from a reviewed configuration and the current local installation state. It is intended for machines where Agent Routines are used across many repositories and the operator wants one auditable plan before installing.

The generator is conservative by default:

- It never scans the whole disk.
- It scans only user-level targets and project roots listed in the config.
- It writes no files unless `-WriteManifest` or `--write-manifest` is passed.
- It installs nothing unless `-Apply` or `--apply` is also passed.
- It reports installed folders that do not exist in this source repository instead of adding or deleting them.

## Config

Start from `tools/install-discovery.config.example.json` and save a reviewed copy outside tracked distribution manifests, for example:

```text
.agent-routines/install-discovery.config.json
```

The key fields are:

| Field | Purpose |
| --- | --- |
| `projectRoots` | Explicit roots to scan for Git repositories, such as `D:\Work\Projects` and `D:\Repositories`. |
| `tools` | Tool sections to generate: `codex`, `claudeCode`, or both. |
| `projectDiscovery.maxDepth` | Maximum directory depth below each project root. |
| `projectDiscovery.excludeDirs` | Directory names skipped during discovery. Include temporary/cache names such as `.tmp`, `.cache`, `tmp`, and `temp` unless you intentionally manage repos there. |
| `projectDiscovery.skipNestedRepos` | Stops traversal below a discovered Git repo when `true`, which is the safer default for large project roots. |
| `scopePolicy.userLevelSkills` | Skills that should be generated under `user.<tool>.skills`. |
| `scopePolicy.projectLevelOnlySkills` | Skills that must not be promoted to user level. User-level installs are reported as conflicts. |
| `scopePolicy.userLevelWorkflows` | Workflows generated at user level. |
| `scopePolicy.projectDefaultWorkflows` | Workflows added for projects that already have project-level Agent Routines targets. |
| `output.manifestPath` | Generated manifest path, resolved from the source repository root. |
| `output.reportPath` | Generated plan report path, resolved from the source repository root. |

Do not put `apply` in the config. `install.force` may be present only as `false`; replacement must be triggered by the CLI flag. Installation and replacement must be explicit so a committed config cannot silently modify a machine.

## Commands

Validate a config shape without scanning or installing:

```powershell
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tests/validate-install-discovery-config.sh --config-path ./.agent-routines/install-discovery.config.json
```

Generate a dry-run plan only:

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json
```

Write the manifest and plan, then validate the manifest:

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -WriteManifest
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --write-manifest
```

Write, validate, install, and run post-install checks:

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -WriteManifest -Apply
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --write-manifest --apply
```

Use `-Force` or `--force` only after reviewing the plan. Force replacement is passed through to the existing manifest installers.

## Scope Inference

Policy is the source of desired scope. Installed state is evidence and migration input.

| Evidence | Result |
| --- | --- |
| Skill appears in `userLevelSkills` and exists in `skills/` | Add to each selected tool's user-level skill block. |
| Skill appears in `projectLevelOnlySkills` | Never add it to user-level blocks. |
| Project-level installed Skill exists in `skills/` | Add it to that project and tool block. |
| Installed Skill or workflow does not exist in this source repo | Report as `unknownInstalledItems`; do not add it. |
| Installed user-level Skill or workflow is not in the corresponding user-level policy | Report as `unclassifiedInstalledItems`; do not add it. |
| Project already has `.codex`, `.claude`, or `.agent-routines` targets | Add existing project workflows and configured `projectDefaultWorkflows`. |

Workflow runtime directories are shared between Codex and Claude Code. To avoid duplicate copies to the same target, generated user-level and project-level workflow arrays are placed only under the first configured tool. Skills remain tool-specific.

## Output

The plan JSON includes:

- `discoveredProjects`
- `scannedUserTargets`
- `scannedProjectTargets`
- `generatedManifest`
- `unknownInstalledItems`
- `unclassifiedInstalledItems`
- `missingPolicyItems`
- `conflicts`
- `skippedProjects`
- `installPlan`
- `commandsToRun`

Review conflicts and unknown items before applying the generated manifest.
