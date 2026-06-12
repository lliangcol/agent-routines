# node-workspace-check Workflow

## Purpose
Inspect Node workspace metadata, package-manager commands, lockfiles, and common validation or release scripts without installing dependencies or publishing.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+, macOS with Bash or PowerShell 7+, and Linux with Bash or PowerShell 7+.

## Parameters

- PowerShell: `-Path`, `-Help`.
- Bash: `--path`, `--help`.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`.

## Example Commands

```powershell
.\workflows\node-workspace-check\node-workspace-check.ps1 -Path .
```

```bash
./workflows/node-workspace-check/node-workspace-check.sh --path .
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without validation errors. Nonzero means invalid arguments or path validation failure.

## Matching Skills

node-workspace-release, guarded-change
