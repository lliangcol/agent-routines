# prompt-qa

## Use Cases

Prompt improvement, prompt-only review-fix-re-review, execution-contract hardening, and conversion of vague instructions into bounded agent tasks.

## Non-Use Cases

Executing the workflow described by the prompt, modifying repository files as part of the prompt's requested outcome, or validating external systems named by the prompt.

## Supported OS

Windows, macOS, and Linux. Platform details matter only when the prompt itself includes platform-specific commands or paths.

## Inputs

Original prompt, intended audience, execution boundary, allowed actions, prohibited actions, expected evidence, and stop conditions.

## Outputs

Repaired prompt, review findings, residual assumptions, `BLOCKED` conditions, and a statement that the described workflow was not executed.

## Execution Steps

Review the full prompt, fix concrete issues, re-review the full repaired prompt, and stop only when no new in-scope prompt defects remain.

## Human Confirmation Points

Executing the prompt, broadening scope, allowing side effects, or choosing between product-level tradeoffs.

## Failure Handling

If the prompt requires unknown authority or external access, keep it prompt-only and mark the execution path as blocked.

## Example Prompts

- "Review and fix this prompt until no new prompt issues remain. Do not execute it."
- "Turn this instruction into an execution contract with permissions and stop rules."

## Recommended Workflows

None required.
