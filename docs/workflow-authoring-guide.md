# Workflow Authoring Guide

A workflow is a deterministic, readonly probe with two equivalent entrypoints. Every workflow folder contains exactly five files:

- `<name>.sh` — Bash entrypoint (`--path PATH` plus workflow-specific flags)
- `<name>.ps1` — PowerShell entrypoint (`-Path` plus workflow-specific parameters)
- `schema.json` — output contract with `"workflow": {"const": "<name>"}`
- `README.md` — purpose, parameters, example invocation
- `examples/sample-output.json` — one realistic, schema-valid output

## Output Contract

Both scripts emit a single JSON object with exactly these keys: `ok` (boolean), `workflow` (the folder name), `cwd` (string), `os` (`windows`/`macos`/`linux`/`unknown`), `checks` (array of `{name, ok, details}`), `warnings` (string array), `errors` (string array). Exit 0 when `ok` is true, 1 when false, 2 for invalid arguments. `tests/run-workflows.{sh,ps1}` executes every workflow against a disposable temp repository and rejects any contract violation.

## Readonly Rules

- Never write inside the inspected path, never open network or database connections, never mutate git state.
- Missing optional context (no `pom.xml`, no `executions/`, wrong OS) is a warning or a non-required failed check — not an error. Workflows must behave on a near-empty repository.
- Reserve `errors` (and exit 1) for required-check failures and invalid input.
- If a workflow executes caller-supplied commands, the destructive-keyword filter is best-effort only; the usage text must say so instead of claiming the run is fully readonly.

## Implementation Conventions

- Scripts are self-contained on purpose: installers copy workflow folders individually, so no shared library files. Copy the helper block (`json_escape`/`add_check`/`add_warning`/`add_error`/`detect_os` in Bash; `Add-Check`/`Add-Warning`/`Add-Error`/`Get-AgentRoutineOs` in PowerShell) verbatim from an existing workflow such as `workflows/commit-check/`. Do not fork or "improve" the helpers in one file only — a helper change must be applied to every workflow script in the same commit.
- Include only the logic the workflow needs. Do not carry dead branches or unused parameters from another workflow.
- Bash `json_escape` must keep the control-character stripping (`tr -d`) so arbitrary file names and command output cannot break the JSON. PowerShell uses `ConvertTo-Json`.
- PowerShell scripts stay ASCII-only and Windows PowerShell 5.1 compatible: no `&&`/`||` pipeline chains, no ternary, no null-coalescing operators.
- Keep `.sh` and `.ps1` check names, required flags, warnings, and exit codes in parity.

## Checklist for a New Workflow

1. Create the five files listed above.
2. Add the five paths to `tests/required-paths.txt` (keep it sorted).
3. Add a row to the workflows tables in `docs/catalog.md` and `docs/catalog.zh-CN.md`. If a skill should recommend the workflow, update that skill's `Recommended workflows:` line first — `tests/validate-docs` enforces that the catalog matching-skills column equals the set of recommending skills.
4. Run the full gate suite in both shells (`validate-structure`, `validate-workflows`, `validate-docs`, `run-workflows`).
