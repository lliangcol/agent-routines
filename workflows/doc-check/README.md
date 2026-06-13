# doc-check Workflow

## Purpose
Aggregate documentation checks and optional safe custom commands while reporting missing runtimes instead of assuming Python exists.

Custom commands pass three best-effort filters before execution: shell control characters (`;`, `&`, `|`, `<`, `>`, backticks, `$(`, newlines) are rejected; destructive keywords (`rm`, `drop`, `update`, `--output`, ...) are rejected; the first token must be on a readonly allowlist (`git` with readonly subcommands such as `status`/`log`/`diff`/`show`, plus `ls`, `cat`, `head`, `tail`, `grep`, and similar). This screening is best-effort, not a security boundary; the caller remains responsible for passing readonly commands.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+, macOS with Bash or PowerShell 7+, and Linux with Bash or PowerShell 7+.

## Parameters

- PowerShell: `-Path`, `-CustomCommand`, `-Help`.
- Bash: `--path`, `--custom-command`, `--help`.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`. Extra workflow-specific details may appear inside `checks`.

## Example Commands

```powershell
.\workflows\doc-check\doc-check.ps1 -Path .
```

```bash
./workflows/doc-check/doc-check.sh --path .
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without validation errors. Nonzero means invalid arguments, validation failure, or rejected unsafe input.

## Matching Skills

pay-docs

## Flow

```mermaid
flowchart TD
  A[Start doc-check] --> B[Parse arguments]
  B --> C[Run readonly checks]
  C --> D[Emit stable JSON]
  D --> E{Errors?}
  E -->|No| F[Exit 0]
  E -->|Yes| G[Exit nonzero]
```
