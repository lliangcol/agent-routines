# commit-guard Checklist

- Read repo-local instructions before touching git state.
- Run `git status --short --untracked-files=all`.
- Run `commit-check` and the repo's relevant validation gates.
- Confirm whether the user authorized a local commit, a push, both, or review only.
- Stage only the intended scope.
- Run `git diff --cached --check` after staging.
- Reuse repo-local git identity patterns when global identity is missing.
- Do not push unless the user explicitly requested push.
- Stop on protected branch, non-fast-forward, unresolved merge, or validation failures.
