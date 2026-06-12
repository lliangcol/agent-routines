# Shell Pitfalls

Argument-mangling traps that make a healthy tool look broken. Before blaming the environment, rule out the shell rewriting the command.

## Quoting and Paths

- Quote every path that can contain spaces — on Windows that is most of them (`C:\Program Files\...`, `C:\Users\liu liang\...`).

```bash
ls "$dir"/*.log          # quotes around the variable, glob outside
"$JAVA_HOME/bin/java" -version
```

```powershell
& "C:\Program Files\Git\bin\git.exe" --version   # call operator for quoted exe paths
```

- PowerShell parses `-` and `@` aggressively; pass opaque flags to native tools through the stop-parsing token: `git log --% --format=%H`.
- In bash, an unquoted `$var` undergoes word splitting AND globbing. `rm $path` with `path="a b"` touches two files. Audit scripts should be checked with `shellcheck` mentally even when readonly.

## Globbing

- bash: a glob with no match stays literal (`*.log` is passed verbatim) unless `nullglob` is set — a tool then errors on a file named `*.log`. Probe with `compgen -G '*.log'` before trusting the expansion.
- zsh: a glob with no match is a hard error (`no matches found`) — a command that "works on Linux/bash" can die on a default macOS shell.
- PowerShell does not glob for native executables; `program *.txt` passes the literal `*.txt`. Expand explicitly: `program (Get-ChildItem *.txt).FullName`.

## Pipelines Across Shell Semantics

- PowerShell pipes objects, not bytes. `Get-Content file | native.exe` re-encodes text (default encoding varies by PS version) and can corrupt binary or UTF-8 data. For byte-exact stdin use `cmd /c "type file | native.exe"` or native redirection.
- Do not pipe directly out of a PowerShell `foreach` statement block — `foreach (...) {...} | Out-File` is a parse error. Use the pipeline cmdlet form (`... | ForEach-Object {...} | ...`) or `$(foreach ...)` subexpression.
- Exit codes: in bash a pipeline's status is the last command's unless `set -o pipefail`. In PowerShell, `$LASTEXITCODE` reflects only the last native command; cmdlet failures show in `$?` instead. Record both when diagnosing.

## PATH Reliability

- When the same command resolves differently per context (terminal vs IDE vs cron/scheduled task), stop using the bare name in diagnosis. Pin the absolute path:

```bash
command -v -a node       # list ALL resolutions in PATH order
/usr/local/bin/node -v   # then probe each candidate explicitly
```

```powershell
(Get-Command node -All).Source
& 'C:\Program Files\nodejs\node.exe' -v
```

- An alias, shell function, or shim (asdf, nvm, pyenv, Windows Store stubs) can shadow the real binary while `--version` still answers. `type node` (bash) / `Get-Command node | Format-List` (PowerShell) reveal what kind of thing actually ran.

## Failure Cases

- Symptom: a command works when typed but fails when run from a script with "file not found" on an argument. Wrong response: reinstall the tool. Correct response: the script lost the quoting — a space or glob character in the argument was split; echo the argv (`printf '[%s]\n' "$@"`) to confirm.
- Symptom: `curl ... | bash` installer behaves differently in PowerShell than documented. Cause: `curl` is an `Invoke-WebRequest` alias on PS 5.1 and PowerShell pipes re-encoded text. Correct response: run in Git Bash, or `curl.exe -fsSL url -o install.sh` then inspect before executing.
- Symptom: cron/scheduled-task job cannot find a tool the user "definitely installed". Cause: non-interactive context has a minimal PATH. Correct response: recommend absolute executable paths in the job definition, not editing global profiles.
