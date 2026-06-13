# Release Process

This repository versions the whole routine library as one unit. Consumers pin a git tag and install from that checkout.

## Versioning Policy

- Format: `X.Y.Z` (CHANGELOG heading) with a matching annotated git tag `vX.Y.Z`.
- Bump `Z` for fixes that change no contract (script behavior fixes, doc corrections).
- Bump `Y` for added skills, workflows, validators, or new optional script parameters.
- Bump `X` for breaking changes: removed or renamed skills/workflows, changed JSON output contract, changed installer flags, or a new manifest schema version.
- The `"version"` field inside `distribution/agent-routines.manifest.json` is the manifest schema version, not the library version. It changes only when the manifest format itself changes incompatibly.

## Release Steps

1. Confirm a clean working tree on `main`.
2. Update `CHANGELOG.md` with a new `X.Y.Z - YYYY-MM-DD` section listing user-visible changes.
3. Run all validation gates on at least one Bash and one PowerShell platform:
   - `validate-structure`, `validate-skills`, `validate-workflows`, `validate-docs`, `validate-changelog`, `validate-manifest`, `run-workflows`.
4. Confirm CI is green for the release commit.
5. Tag: `git tag -a vX.Y.Z -m "Agent Routines X.Y.Z"`.
6. Push branch and tag: `git push origin main vX.Y.Z` (requires human confirmation).
7. Create a GitHub release from the tag; paste the CHANGELOG section as release notes.

## Consumer Update Guidance

- Pin installs to a tag, not to `main`.
- Before reinstalling with `--force`/`-Force`, diff the new tag against the installed version and re-review skills going to user-level directories.
- Uninstall flows never remove unlisted content; removing a renamed routine requires an explicit uninstall of the old name.

## Deprecation

Mark a routine as deprecated in its README and the catalog one minor version before removal. Removal is a major version bump and must be listed under a "Removed" heading in the CHANGELOG.
