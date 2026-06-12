# runtime repair checklist

- Record shell, command, exact stderr, exit code, and resolved executable path.
- Check package-manager shim and real package bin directory separately.
- Inspect user config only as readonly evidence unless edits are authorized.
- For hook JSON failures, generate payload bytes in a real programming language instead of relying on shell quoting.
- Separate auth/login blockers from binary launch failures.
- Cross-check package registry and release notes before recommending upgrades.
