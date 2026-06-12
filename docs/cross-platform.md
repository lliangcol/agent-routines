# Cross-Platform Support

## Support Matrix

| Target | Shells | Status |
| --- | --- | --- |
| Windows 10/11 | Windows PowerShell 5.1, PowerShell 7+, Git Bash when available | Supported |
| macOS | Bash, PowerShell 7+ | Supported |
| Linux | Bash, PowerShell 7+ | Supported |

## Path Differences

Use `~` or `$HOME` in portable documentation. Windows examples may show `%USERPROFILE%`. Scripts should build paths with `Join-Path` in PowerShell and quoted variables in Bash.

## Shell Differences

PowerShell uses objects and named parameters. Bash uses strings, exit codes, and quoted variables. Avoid Windows-only commands unless guarded by OS detection and a fallback.

## Line Endings

Bash scripts should use LF line endings. PowerShell scripts tolerate CRLF or LF. Keep generated archives and examples readable across tools.

## OS-Specific Functions And Fallbacks

Windows profiles may inspect registry or startup locations only in readonly mode unless confirmation is given. macOS/Linux profiles should check shell availability, PATH, package manager presence, executable permissions, line endings, and runtime versions.

## macOS/Linux Fallback Behavior

If PowerShell 7 is missing, use Bash scripts. If a package manager is missing, report the missing prerequisite instead of attempting installation.

## Testing Strategy

Run PowerShell validators on Windows and PowerShell 7 targets. Run Bash validators on macOS/Linux and Git Bash where available. Treat missing runtimes as warnings unless the requested workflow requires them.