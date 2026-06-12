# security-check Workflow

## Purpose

Scan local files for high-confidence secret-like patterns and manual-review private path signals without printing sensitive values, deleting files, rotating credentials, rewriting history, or publishing results.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+, macOS with Bash or PowerShell 7+, and Linux with Bash or PowerShell 7+.

## Parameters

- PowerShell: `-Path`, `-Help`.
- Bash: `--path`, `--help`.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`.

## Example Commands

```powershell
.\workflows\security-check\security-check.ps1 -Path .
```

```bash
./workflows/security-check/security-check.sh --path .
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without high-confidence sensitive findings. Nonzero means invalid arguments, path validation failure, or high-confidence sensitive findings.

## Matching Skills

security-review, release-guard, commit-guard
