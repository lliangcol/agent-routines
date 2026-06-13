# Contributing

This repository distributes agent Skills, deterministic readonly workflows, and installation adapters. Contributions must keep the validation gates green on both Bash and PowerShell.

## Before You Start

Read `AGENTS.md` (hard rules), `docs/skill-authoring-guide.md`, and `docs/workflow-authoring-guide.md`.

## Validation Gates

CI runs the full suite on Ubuntu (Bash) and Windows (PowerShell 7 and Windows PowerShell 5.1). Run locally before opening a PR:

```bash
./tests/validate-structure.sh && ./tests/validate-skills.sh && ./tests/validate-workflows.sh && ./tests/validate-docs.sh && ./tests/validate-changelog.sh && ./tests/validate-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json && ./tests/run-workflows.sh
```

`run-workflows` also asserts sh-vs-ps1 parity (same exit code, ok flag, check names, and warning/error counts) for every workflow whenever the counterpart shell is available, so keep both implementations in lockstep within a single change.

When adding a new `.sh` file on Windows, set its executable bit in the git index before committing: `git update-index --chmod=+x <file>`. CI runs the Bash suite by direct invocation and fails on files without the bit.

## Adding a Skill

1. Create `skills/<name>/` with `SKILL.md`, `README.md`, and at least one file under `references/`.
2. Frontmatter must contain `name` (kebab-case, no forbidden tokens), `description`, and `os: cross-platform`.
3. The `Recommended workflows:` line in `SKILL.md` is machine-parsed; list only existing workflow names, comma-separated, or `none required`.
4. References must carry real substance: decision criteria, concrete command sequences, and failure cases — not placeholder sentences.
5. Add rows to `docs/catalog.md` and `docs/catalog.zh-CN.md` (the recommended/matching columns must match SKILL.md; `tests/validate-docs` enforces it).
6. Add the new `SKILL.md` path to `tests/required-paths.txt`.
7. Decide whether the skill belongs in `distribution/agent-routines.manifest.json`.

## Adding a Workflow

1. Create `workflows/<name>/` with `<name>.sh`, `<name>.ps1`, `schema.json`, `README.md`, and `examples/sample-output.json`.
2. Both scripts must emit the standard JSON contract (`ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, `errors`) and stay readonly. Copy the helper block from an existing workflow verbatim; see the workflow authoring guide.
3. `schema.json` pins `"workflow": {"const": "<name>"}`.
4. Add the five file paths to `tests/required-paths.txt`.
5. Add a row to both catalog files. If a skill should recommend the workflow, update that skill's `Recommended workflows:` line first.
6. `tests/run-workflows.{sh,ps1}` automatically executes every workflow folder; make sure your workflow behaves on a near-empty temp repository (warn, do not fail, when optional context is missing).

## Documentation

Every file in `docs/` requires a `.zh-CN.md` counterpart with equivalent content. Keep code, commands, paths, and names untranslated.

## Commits and Releases

- Keep commits scoped; reference the validator output in the PR description.
- Releases follow `docs/release-process.md`: CHANGELOG entry, full gates, annotated `vX.Y.Z` tag.

## Branch Protection

The `main` branch is expected to carry these GitHub settings (configured in the repository settings, not in this tree):

- Require a pull request before merging, with review from the code owners in `.github/CODEOWNERS`.
- Require the `Bash gates`, `PowerShell gates`, and `Secret scan (gitleaks)` status checks to pass.
- Block force pushes and branch deletion.
