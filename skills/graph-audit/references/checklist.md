# graph-audit Checklist

Determine whether graph/MCP code discovery is actually usable for this checkout before relying on it, and keep graph-derived claims labeled with their coverage boundary.

## Availability Probe Sequence

1. Read repo-local discovery instructions first (`CLAUDE.md`, `AGENTS.md`, `.mcp.json`) — they may mandate graph-first discovery or name the expected project entry. Instructions are repo-local; tool availability is global. Keep the scopes separate.
2. Check tool availability: are the graph MCP tools present in the current session at all? Absent tools end the graph path immediately — fall back, do not attempt installation.
3. Check project registration: list indexed projects and match against this checkout. Match on the repository identity (root path or configured project name), not on a similar-looking name — `app` vs `app-v2` confusion produces confidently wrong results from the *wrong codebase*.
4. Check index freshness: compare the index timestamp/commit against `git log -1 --format=%H`. An index N commits behind is usable for stable architecture questions, unusable for "does X still call Y" questions about recently changed code.

## Routing Decision

| State | Route |
|---|---|
| Tools available + project indexed + fresh | Graph-first (search/trace), grep only to confirm text details |
| Tools available + indexed but stale | Graph for stable-structure questions; verify any claim touching recently changed files against the checkout |
| Tools available + project not indexed | Filesystem discovery; offer indexing as an explicit user decision (large repos cost time/resources) |
| Tools unavailable | Targeted readonly file inspection (Glob/Grep/Read); say so in the report |

## Boundaries

- Do not install graph tooling, register MCP servers, or trigger indexing without confirmation — indexing can upload code and consume significant resources; both points must be stated when asking.
- Graph results are claims about the *index*, not the checkout. For any load-bearing conclusion (e.g., "nothing calls this function — safe to remove"), spot-verify with grep against the working tree before reporting.

## Failure Cases

- Symptom: graph search returns zero results for a symbol that plainly exists in the checkout. Wrong response: report "not found". Correct response: coverage gap — the file type, directory, or commit range is not indexed; fall back to grep and report the gap.
- Symptom: trace results reference files that do not exist in the working tree. Cause: stale index (or wrong project). Correct response: re-check registration and freshness; label all graph claims from this session as stale-index-derived.
- Symptom: two indexed projects could plausibly match this repo. Wrong response: pick the closer name. Correct response: disambiguate by root path/remote URL; if still ambiguous, treat as unindexed and report it.
