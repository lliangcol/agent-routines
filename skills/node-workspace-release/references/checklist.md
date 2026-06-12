# node workspace release checklist

- Read `package.json`, workspace files, lockfiles, and repo rules.
- Use `packageManager` when present.
- Prefer `doctor`, `validate`, `test`, and dry-run scripts already defined by the repo.
- Do not run publish commands unless explicitly authorized.
- Treat generated marketplace files as outputs whose source metadata must be checked first.
- Report skipped install or publish actions explicitly.
