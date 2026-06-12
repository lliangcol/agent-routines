# Environment Checks

Readonly probe sequence for diagnosing a local toolchain. Run what is relevant, record exact outputs, change nothing.

## Core Probes (All Platforms)

| Question | POSIX | PowerShell |
|---|---|---|
| Which OS/arch | `uname -sm` | `$env:OS; [Environment]::OSVersion` |
| Which shell am I in | `echo $0; echo $SHELL` | `$PSVersionTable.PSVersion; $PSVersionTable.PSEdition` |
| Where does a command resolve | `command -v git; type git` | `(Get-Command git).Source` |
| PATH order | `printf '%s\n' "$PATH" \| tr ':' '\n'` | `$env:Path -split ';'` |
| Runtime versions | `git --version; node -v; python3 -V; java -version` | same commands |
| Package managers | `command -v npm pnpm yarn pip uv brew apt` | `Get-Command npm,pnpm,pip,uv -ErrorAction SilentlyContinue` |
| Line endings policy | `git config core.autocrlf; cat .gitattributes` | same |
| Executable bit (POSIX) | `ls -l script.sh` | n/a |
| Proxy interference | `env \| grep -i proxy` | `Get-ChildItem env: \| Where-Object Name -match 'proxy'` |

The `preflight` and `runtime-check` workflows automate the repository-context subset of these.

## Diagnosis Discipline

- Always capture: exact command, exit code, full stderr, and the resolved executable path. "node is broken" is not a finding; "`node` resolves to `C:\nvm\v16\node.exe` while the repo requires >=20 per `.nvmrc`" is.
- When two installations of the same tool exist, PATH order is the prime suspect. Compare `command -v -a tool` (POSIX) / `Get-Command tool -All` (PowerShell).
- Distinguish four root-cause classes before recommending anything: (1) tool missing, (2) wrong version resolved first, (3) tool present but environment vars/config wrong, (4) tool fine but invoked with shell-mangled arguments (see shell-pitfalls).

## Decision Criteria

- Missing prerequisite (compiler, runtime) → classify as environment prerequisite, not a project defect, unless the project claims to vendor it (see examples).
- Version mismatch against a pinning file (`.nvmrc`, `rust-toolchain.toml`, `pom.xml` enforcer) → the pin wins; never suggest editing the pin to match the machine.
- Network-dependent failure (registry timeouts) → verify reachability separately before blaming the package manager.

## Failure Cases

- Symptom: command works in one terminal but not another. Wrong response: reinstall the tool. Correct response: the two terminals have different PATH (login vs non-login shell, or an IDE-injected environment); diff `printenv`/`Get-ChildItem env:` between them.
- Symptom: script fails only in CI. Correct response: compare line endings and executable bits first (`git ls-files --eol`), then PATH; do not start by editing the script.
