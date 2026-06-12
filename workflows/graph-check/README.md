# graph-check Workflow

## Purpose

Inspect local graph and MCP readiness signals such as command availability, graph-first instruction files, and common graph metadata paths without registering MCP servers, indexing repositories, installing graph tools, or uploading code.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+, macOS with Bash or PowerShell 7+, and Linux with Bash or PowerShell 7+.

## Parameters

- PowerShell: `-Path`, `-Help`.
- Bash: `--path`, `--help`.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`.

## Example Commands

```powershell
.\workflows\graph-check\graph-check.ps1 -Path .
```

```bash
./workflows/graph-check/graph-check.sh --path .
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without validation errors. Nonzero means invalid arguments or path validation failure.

## Matching Skills

graph-audit, env-audit, governance-audit
