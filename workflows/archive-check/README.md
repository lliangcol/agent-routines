# archive-check Workflow

## Purpose
Validate execution archive layout, required files, evidence directories, artifacts directories, and front matter expectations.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+, macOS with Bash or PowerShell 7+, and Linux with Bash or PowerShell 7+.

## Parameters

- PowerShell: `-Path`, `-CustomCommand`, `-Sql`, `-SqlFile`, `-Help` where applicable.
- Bash: `--path`, `--custom-command`, `--sql`, `--sql-file`, `--help` where applicable.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`. Extra workflow-specific details may appear inside `checks`.

## Example Commands

```powershell
.\workflows\archive-check\archive-check.ps1 -Path .
```

```bash
./workflows/archive-check/archive-check.sh --path .
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without validation errors. Nonzero means invalid arguments, validation failure, or rejected unsafe input.

## Matching Skills

guarded-change, review-loop

## Flow

```mermaid
flowchart TD
  A[Start archive-check] --> B[Parse arguments]
  B --> C[Run readonly checks]
  C --> D[Emit stable JSON]
  D --> E{Errors?}
  E -->|No| F[Exit 0]
  E -->|Yes| G[Exit nonzero]
```
