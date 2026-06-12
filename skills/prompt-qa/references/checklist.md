# prompt-qa Checklist

- Confirm the task is prompt-only.
- Preserve the user's intended goal.
- Add explicit allowed and prohibited actions.
- Add evidence outputs and success criteria.
- Add stop rules and `BLOCKED` behavior.
- Separate plan-only, review-only, and execution modes.
- Avoid authorizing installs, commits, pushes, publishing, destructive commands, or external access by accident.
- Re-read the complete repaired prompt after each fix.
- State whether any assumptions remain.
