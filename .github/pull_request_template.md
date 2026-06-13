# Pull Request

## Summary

<!-- What does this change and why? -->

## Validation Gates

Paste the output of the full gate suite from at least one platform. CI also runs both stacks.

- [ ] `./tests/validate-structure.sh` / `.\tests\validate-structure.ps1`
- [ ] `./tests/validate-skills.sh` / `.\tests\validate-skills.ps1`
- [ ] `./tests/validate-workflows.sh` / `.\tests\validate-workflows.ps1`
- [ ] `./tests/validate-docs.sh` / `.\tests\validate-docs.ps1`
- [ ] `./tests/validate-changelog.sh` / `.\tests\validate-changelog.ps1`
- [ ] `./tests/validate-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json`
- [ ] `./tests/run-workflows.sh` / `.\tests\run-workflows.ps1`

## Hard-Rule Checklist

- [ ] Workflow scripts stay readonly (no writes in the inspected repository, no network, no DB, no git mutations).
- [ ] Every changed workflow keeps `.sh` and `.ps1` in parity (same checks, same JSON shape, same exit codes).
- [ ] PowerShell scripts remain ASCII-only and Windows PowerShell 5.1 compatible.
- [ ] Added or removed required files are reflected in `tests/required-paths.txt`.
- [ ] New `.sh` files have the executable bit set in the git index (`git update-index --chmod=+x <file>`).
- [ ] Catalog files match `Recommended workflows:` lines in `skills/*/SKILL.md`.
- [ ] Every touched file in `docs/` has its `.zh-CN.md` counterpart updated.
