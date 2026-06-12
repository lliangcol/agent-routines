# startup-check Workflow

## Purpose
Inspect Windows startup sources such as Run keys, StartupApproved keys, and startup-like scheduled tasks without removing registry values or disabling tasks.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+. Bash on Windows may use `reg.exe` and `schtasks.exe`; macOS and Linux report unsupported startup sources.

## Parameters

- PowerShell: `-Path`, `-Help`.
- Bash: `--path`, `--help`.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`.

## Example Commands

```powershell
.\workflows\startup-check\startup-check.ps1 -Path .
```

```bash
./workflows/startup-check/startup-check.sh --path .
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without validation errors. Nonzero means invalid arguments or path validation failure.

## Matching Skills

env-audit
