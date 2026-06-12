# POSIX Profile

macOS/Linux-specific probes. All readonly.

## Shell and PATH

```bash
echo "$SHELL"; ps -p $$ -o comm=     # configured vs actually-running shell
printf '%s\n' "$PATH" | tr ':' '\n'
command -v -a node                    # every resolution, in PATH order
```

- Login vs non-login and interactive vs non-interactive shells source different files (`.profile`, `.bashrc`, `.zshrc`, `.zprofile`). A tool "missing" in a script but present interactively almost always means the export lives in an interactive-only rc file.
- macOS default shell is zsh; scripts assuming bash arrays/`[[` must declare `#!/usr/bin/env bash`, and macOS ships bash 3.2 — features like `mapfile` need a newer brew bash.

## Package Manager Detection

```bash
command -v brew apt dnf pacman apk >/dev/null 2>&1 && echo present
brew --prefix 2>/dev/null              # /opt/homebrew (arm64) vs /usr/local (x86)
```

Apple Silicon note: x86 binaries under Rosetta and arm64 binaries can coexist; `file "$(command -v tool)"` reveals the architecture when "works on my mac" diverges.

## Permissions and Executability

```bash
ls -l script.sh                        # executable bit
git ls-files --stage script.sh         # 100755 vs 100644 — what git will ship
xattr -l ./downloaded-binary 2>/dev/null | grep -i quarantine   # macOS Gatekeeper
```

- A script that runs locally but fails in CI with "Permission denied" usually has mode 100644 in git even though the local copy was chmod'd: fix is `git update-index --chmod=+x` (a change — requires authorization).
- macOS quarantine attribute blocks downloaded binaries; recommend `xattr -d` only as an explicit user action.

## Line Endings

```bash
git ls-files --eol | grep -v 'i/lf'    # anything not committed as LF
```

CRLF in a shebang line produces `bad interpreter: /bin/bash^M` — fix in `.gitattributes`, not by re-saving files one by one.

## Failure Cases

- Symptom: `command not found` inside cron/systemd but fine in terminal. Cause: minimal PATH in non-interactive context. Fix recommendation: absolute paths in the unit/crontab, not editing global profiles.
- Symptom: brew-installed tool not found after install on Apple Silicon. Cause: `/opt/homebrew/bin` missing from PATH in this shell. Verify with `brew shellenv`; recommend the user append it to their shell rc.
