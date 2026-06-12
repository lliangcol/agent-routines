# commit-check Workflow

## Purpose

Inspect git commit readiness, branch state, worktree dirtiness, staged and untracked files, git identity, and diff whitespace checks without staging, committing, pushing, tagging, or rewriting history.

## Supported OS

Windows 10/11 with Windows PowerShell 5.1 or PowerShell 7+, macOS with Bash or PowerShell 7+, and Linux with Bash or PowerShell 7+.

## Parameters

- PowerShell: `-Path`, `-Help`.
- Bash: `--path`, `--help`.

## JSON Schema Summary

Every run returns `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`.

## Example Commands

```powershell
.\workflows\commit-check\commit-check.ps1 -Path .
```

```bash
./workflows/commit-check/commit-check.sh --path .
```

## Example Output

See `examples/sample-output.json`.

## Exit Code Convention

Exit code `0` means the workflow finished without validation errors. Nonzero means invalid arguments or failed commit-readiness validation.

## Matching Skills

commit-guard, guarded-change, review-loop
