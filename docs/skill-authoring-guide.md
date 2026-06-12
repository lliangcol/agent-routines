# Skill Authoring Guide

A Skill is the judgment layer: when to act, what order to act in, where the risk boundaries sit, and when to stop and ask a human. Deterministic checking belongs in workflows, not in Skill prose.

## Required Structure

Every skill folder contains `SKILL.md`, `README.md`, and a `references/` directory with at least one substantive file.

`SKILL.md` frontmatter (enforced by `tests/validate-skills`):

- `name`: lowercase kebab-case, matching the folder name; must not contain `claude`, `anthropic`, XML tags, spaces, or uppercase letters.
- `description`: one sentence saying what the Skill does and when to invoke it (max 1024 characters).
- `os: cross-platform`.

Body sections cover operating system support, the flow, workflow routing, human confirmation gates, and failure routing.

## The Recommended Workflows Line

The `Recommended workflows:` line is machine-parsed by `tests/validate-docs`. List existing workflow folder names, comma-separated, or `none required`. The catalogs (`docs/catalog.md`, `docs/catalog.zh-CN.md`) must mirror this line in the skill row, and the workflow rows' matching-skills column must equal the set of skills recommending that workflow.

## References Must Carry Substance

References are the payload a user actually installs. A reference file earns its place only if it contains at least one of:

- a decision tree or explicit decision criteria ("if X and Y, do A; if X without Y, stop and ask"),
- concrete command sequences with expected output and what to do when the output differs,
- real failure cases: the symptom, the wrong "obvious" response, and the correct response.

One-sentence placeholder files are not acceptable; a Skill whose references cannot be filled with real operational knowledge should be removed rather than shipped hollow.

Keep references tool-neutral and cross-platform: name the OS or shell explicitly whenever behavior differs, and provide both PowerShell and POSIX variants for any command that differs between them.

## Checklist for a New Skill

1. Create `skills/<name>/SKILL.md`, `README.md`, and substantive `references/`.
2. Add the `SKILL.md` path to `tests/required-paths.txt`.
3. Add rows to both catalog files consistent with the `Recommended workflows:` line.
4. Decide whether the skill enters `distribution/agent-routines.manifest.json`.
5. Run `validate-structure`, `validate-skills`, `validate-docs`, and `validate-manifest` in both shells.
