# prompt-qa Checklist

Review and repair a prompt without executing the workflow it describes. The boundary is absolute: reading files the prompt references for context is fine; performing any step the prompt orders is execution.

## 1. Confirm the Task Is Prompt-Only

If the request mixes "fix this prompt" with "and run it", split explicitly and handle only the prompt half; running it is a separate, gated decision. State at the end of every prompt-qa session: "the described workflow was not executed."

## 2. Preserve the Intended Goal

Before any repair, restate the prompt's goal in one sentence and check repairs against it. The classic failure is a "safer" prompt that no longer accomplishes the task — safety edits that hollow out the goal are defects, not improvements.

## 3. Audit Dimensions (in order)

| Dimension | What to check | Typical defect |
|---|---|---|
| Execution boundary | Is it plan-only, review-only, or execution? Stated, or inferable only by accident? | Mode missing → executor decides for itself |
| Allowed actions | Explicit allowlist of operations the agent may take | "Analyze the repo" silently authorizing arbitrary commands |
| Prohibited actions | Explicit denylist: installs, commits, pushes, publishing, deletes, network, secrets | Prohibitions implied but never stated |
| Evidence outputs | What artifacts prove the work: commands + exit codes, file lists, verbatim outputs | "Verify it works" with no evidence definition |
| Success criteria | Objective done-condition | "Improve the docs" with no measurable end |
| Stop rules | When to halt: unexpected state, missing access, conflicts | Agent ploughs through anomalies |
| `BLOCKED` protocol | The required output format when stopped and what not to do meanwhile | Agent invents a fallback instead of stopping |

## 4. Accidental Authorization Sweep

Re-read the repaired prompt hunting for verbs that smuggle in permissions: "set up" (installs?), "make sure tests pass" (edits source?), "publish the report" (external posting?), "clean up" (deletes?). Each either gets an explicit boundary or gets rewritten. Also check scope nouns: "the project" vs a named directory; "latest version" vs a pinned ref.

## 5. Repair Style

- Smallest edit achieving the fix; keep the author's voice and structure.
- Add constraints in the prompt's own format (its headings, list style) rather than bolting on a foreign style.
- Never remove existing constraints, paths, or context whose purpose is unclear — ask or keep.

## 6. Re-Read Loop

After each round of fixes, re-read the *complete* repaired prompt top to bottom — repairs interact (a new stop rule may contradict an existing fallback instruction; a new prohibition may block the stated goal). Repeat until a full pass yields no new findings. End by stating remaining assumptions explicitly.

## Failure Cases

- Symptom: the prompt needs a product decision (e.g., which environment is authoritative) to be made safe. Wrong response: pick the likely answer and bake it in. Correct response: mark the ambiguity `BLOCKED` in the review output; an invented decision in a prompt silently propagates to every future execution.
- Symptom: reviewing the prompt requires knowing whether a referenced script is destructive. Correct response: reading the script is allowed (context); running it to find out is not.
- Symptom: after three repair rounds, fixes keep generating new conflicts. Cause: the prompt is overloaded with multiple workflows. Correct response: recommend splitting into separate prompts rather than patching further.
