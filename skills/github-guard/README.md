# github-guard

## Use Cases

GitHub Actions inventory, required-check selection, branch ruleset drafting, PR protection review, and conservative remote-settings handoff.

## Non-Use Cases

Saving GitHub settings, enabling branch protection, or changing remote repository configuration without explicit authorization.

## Supported OS

Windows, macOS, and Linux for local workflow inspection. Remote GitHub operations depend on authenticated tools or browser sessions.

## Inputs

Repo path, target branch policy, local workflow files, known required checks, and authorization boundary.

## Outputs

Candidate checks, ruleset draft, unverified remote-only checks, blockers, and safe next steps.

## Execution Steps

Run github-check, inspect `.github/workflows`, derive candidate checks, draft settings, then stop before saving remote changes unless authorized.

## Human Confirmation Points

Saving rulesets, changing branch protection, enabling required checks, or submitting remote settings forms.

## Failure Handling

If no workflow evidence exists, report that required checks cannot be selected from local evidence.

## Example Prompts

- "Draft GitHub branch protection from this repo's workflow evidence. Do not save it."
- "List candidate required checks for the default branch."

## Recommended Workflows

github-check, release-check, gate-check
