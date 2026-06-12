# Windows Profile

Windows-specific probes and traps. All checks readonly; registry and startup inspection goes through the `startup-check` workflow.

## Shells Are Plural on Windows

A machine typically carries Windows PowerShell 5.1 (`powershell.exe`), PowerShell 7+ (`pwsh.exe`), cmd.exe, and often Git Bash (MSYS). The same command line can behave differently in each. Always record which shell produced an error:

```powershell
$PSVersionTable.PSVersion; $PSVersionTable.PSEdition   # 5.1 = Desktop, 7+ = Core
```

- PS 5.1 reads UTF-8 files without BOM as ANSI — non-ASCII in scripts corrupts silently.
- `&&` / `||`, ternary, and `?.` exist only in PS 7+; a script using them dies on 5.1 with a parse error.

## Aliases That Shadow Real Tools

In Windows PowerShell, `curl` and `wget` are aliases for `Invoke-WebRequest`, and `where` is a cmdlet alias — none accept the flags of the real binaries:

```powershell
Get-Alias curl,wget -ErrorAction SilentlyContinue
where.exe git        # the real path lookup; 'where git' alone may not be
curl.exe --version   # force the real binary with the .exe suffix
```

## PATH and Tool Resolution

```powershell
$env:Path -split ';'
(Get-Command python -All).Source   # may show WindowsApps stub first
```

- The `WindowsApps` python stub opens the Store instead of running Python; uv- or pyenv-managed Pythons must outrank it in PATH.
- Git Bash is frequently installed but not on PATH; its tools live under `C:\Program Files\Git\usr\bin`.
- Per-user vs machine PATH are concatenated; an installer that wrote machine PATH requires a new session (or logoff) to be visible.

## Native Build Prerequisites

Native npm/python modules need Visual Studio Build Tools + Windows SDK. Probe readonly:

```powershell
Test-Path 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
& 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe' -products * -property installationPath
```

## Startup and Registry (Readonly)

Use `startup-check` for Run keys, StartupApproved keys, and startup-like scheduled tasks. Never modify registry values during an audit.

## Failure Cases

- Symptom: `python script.py` opens the Microsoft Store. Cause: WindowsApps stub shadows the real install. Fix recommendation: PATH reorder (user action), not reinstalling Python.
- Symptom: a `.ps1` works in `pwsh` but errors with "Unexpected token '&&'" in another terminal. Cause: that terminal is PS 5.1. Fix: report the 5.1 incompatibility; do not assume the user can switch shells.
- Symptom: `curl -fsSL url | bash` fails oddly in PowerShell. Cause: alias + pipeline semantics; recommend running in Git Bash or using `curl.exe`.
