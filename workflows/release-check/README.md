# release-check Workflow

## Purpose

Inspect public release readiness signals such as package metadata, README, license, security notes, changelog, workflow evidence, and release tooling without publishing, tagging, pushing, mutating versions, installing dependencies, or creating artifacts.

Default mode reports missing public-support files as non-required checks. Public mode requires `SECURITY.md` and `SUPPORT.md` before readiness can pass.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+, macOS with Bash or PowerShell 7+, and Linux with Bash or PowerShell 7+.

## Parameters

- PowerShell: `-Path`, `-Public`, `-Help`.
- Bash: `--path`, `--public`, `--help`.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`.

## Example Commands

```powershell
.\workflows\release-check\release-check.ps1 -Path .
.\workflows\release-check\release-check.ps1 -Path . -Public
```

```bash
./workflows/release-check/release-check.sh --path .
./workflows/release-check/release-check.sh --path . --public
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without validation errors. Nonzero means invalid arguments or path validation failure.

## Matching Skills

release-guard, node-workspace-release, security-review
