# archive-record

## Use Cases

Execution archives, reusable runbooks, evidence capture, artifact separation, and end-of-task archive validation.

## Non-Use Cases

Replacing source control history, storing secrets, or archiving unreviewed generated output as authoritative evidence.

## Supported OS

Windows, macOS, and Linux. Timestamp formats should be explicit and stable.

## Inputs

Task slug, execution date, runbook path, evidence files, artifacts, and validation command.

## Outputs

Archive path, required files, evidence summary, artifact list, and validation result.

## Execution Steps

Classify record type, place files in the expected layout, keep raw logs in artifacts, store reviewed evidence separately, then run archive-check.

## Human Confirmation Points

Deleting archives, moving historical records, changing schema, or including sensitive logs.

## Failure Handling

If layout validation fails, fix path shape or required files before summarizing the task as archived.

## Example Prompts

- "Create an execution record for this completed local task."
- "Validate whether future archive records follow the current layout."

## Recommended Workflows

archive-check
