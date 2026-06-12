# governance-check Workflow

## Purpose
Inspect current checkout governance files, agent directories, validation scripts, and git state without treating archived documents as current proof.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+, macOS with Bash or PowerShell 7+, and Linux with Bash or PowerShell 7+.

## Parameters

- PowerShell: `-Path`, `-Help`.
- Bash: `--path`, `--help`.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`.

## Example Commands

```powershell
.\workflows\governance-check\governance-check.ps1 -Path .
```

```bash
./workflows/governance-check/governance-check.sh --path .
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without validation errors. Nonzero means invalid arguments or path validation failure.

## Matching Skills

governance-audit, guarded-change
