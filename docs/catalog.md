# Routine Catalog

This catalog lists every source Skill and workflow currently maintained in this repository. Skill folders remain the source of truth for judgment and routing. Workflow folders remain the source of truth for deterministic scripts and JSON output.

## Skills

| Name | Purpose | Recommended workflows | Use when |
|---|---|---|---|
| `api-sync` | Backend API, DTO, or enum changes that affect frontend wrappers, types, enums, or UI. | `preflight`, `gate-check` | Backend contract changes need frontend impact analysis and minimal validation. |
| `archive-record` | Durable execution records, runbooks, evidence folders, artifacts, and archive layout validation. | `archive-check` | A completed task needs durable evidence or runbook storage. |
| `commit-guard` | Validated local commit and optional push workflows with explicit scope, identity, gates, and confirmation. | `commit-check`, `gate-check`, `preflight` | A change needs commit readiness review, staging discipline, or an authorized local commit. |
| `dms-repair` | Database repair work that starts readonly, prepares minimal SQL, and verifies with readonly post-checks. | `db-read` | A database fix needs human DMS execution and local readonly evidence. |
| `env-audit` | Cross-platform environment, dependency, shell, PATH, and toolchain audits. | `preflight`, `gate-check`, `runtime-check`, `startup-check` | Local toolchain or shell behavior needs readonly diagnosis. |
| `github-guard` | GitHub Actions, required checks, branch ruleset, and pull request protection planning. | `github-check`, `release-check`, `gate-check` | GitHub policy should be drafted from repository evidence without saving remote settings. |
| `governance-audit` | Source-first repository governance audits with current evidence separated from history and assumptions. | `governance-check`, `preflight` | Governance claims need current checkout proof and authority classification. |
| `graph-audit` | Codebase graph and MCP readiness checks with indexing scope and fallback discovery. | `graph-check`, `preflight`, `governance-check` | Graph-first discovery is requested or repo instructions mention MCP graph tools. |
| `guarded-change` | Governed repository code changes with local rules, risk gates, minimal edits, and verification. | `preflight`, `gate-check` | A repository change needs scoped implementation and validation. |
| `java-maven-verify` | Java Maven verification with module scope, shell quoting, Maven mirrors, and targeted tests. | `maven-check`, `gate-check` | Maven readiness or targeted Java tests need careful command construction. |
| `knowledge-drift` | Markdown knowledge, generated stubs, and evidence packs checked against current source and policies. | `drift-check`, `doc-check` | Documentation or knowledge artifacts may be stale. |
| `merge-fix` | Merge conflict resolution with both sides understood and path-limited validation. | `merge-check`, `gate-check` | Conflict markers or merge state need safe resolution and verification. |
| `node-workspace-release` | Node, npm, pnpm, workspace, plugin marketplace, and release dry-run workflows. | `node-workspace-check`, `gate-check` | A Node workspace or package release needs readonly checks before publication. |
| `pay-docs` | Payment, subscription, and configuration documentation that is Chinese-first and source-backed. | `doc-check` | Payment or subscription docs need source-backed scenario matrices and risk notes. |
| `prompt-qa` | Prompt-only review, repair, and re-review without executing the described workflow. | None required | A prompt needs permissions, evidence, stop rules, and `BLOCKED` behavior. |
| `release-guard` | Public release readiness checks for package contents, metadata, docs, dry runs, and publication gates. | `release-check`, `security-check`, `node-workspace-check`, `gate-check` | A package or public repo needs release-readiness classification before publishing. |
| `review-loop` | Review current branch changes, fix actionable issues, and repeat until no new in-scope issues remain. | `preflight`, `gate-check` | The user asks for review-fix-re-review over current changes. |
| `runtime-repair` | Local agent runtime diagnosis and repair planning for shims, package managers, hooks, versions, and encoding. | `runtime-check`, `preflight` | Agent runtime startup, hook, PATH, or version issues need diagnosis. |
| `security-review` | Local security and public-leakage review before commits, releases, or distribution. | `security-check`, `release-check`, `gate-check` | Sensitive values, private paths, or public package leakage need redacted review. |

## Workflows

| Name | Purpose | PowerShell | Bash | Matching skills |
|---|---|---|---|---|
| `archive-check` | Validate execution archive layout, required files, evidence directories, artifacts directories, and front matter expectations. | `.\workflows\archive-check\archive-check.ps1 -Path .` | `./workflows/archive-check/archive-check.sh --path .` | `archive-record` |
| `commit-check` | Inspect commit readiness, branch state, worktree dirtiness, staged and untracked files, git identity, and diff checks. | `.\workflows\commit-check\commit-check.ps1 -Path .` | `./workflows/commit-check/commit-check.sh --path .` | `commit-guard` |
| `db-read` | Validate readonly SQL wrapper inputs and reject write, DDL, and execution keywords without connecting to a database. | `.\workflows\db-read\db-read.ps1 -Path .` | `./workflows/db-read/db-read.sh --path .` | `dms-repair` |
| `doc-check` | Aggregate documentation checks and optional safe custom commands while reporting missing runtimes clearly. | `.\workflows\doc-check\doc-check.ps1 -Path .` | `./workflows/doc-check/doc-check.sh --path .` | `knowledge-drift`, `pay-docs` |
| `drift-check` | Inspect knowledge roots, drift metadata, Markdown frontmatter coverage, and local drift tool availability. | `.\workflows\drift-check\drift-check.ps1 -Path .` | `./workflows/drift-check/drift-check.sh --path .` | `knowledge-drift` |
| `gate-check` | Run safe common gates such as git diff checks and explicitly supplied non-destructive custom commands. | `.\workflows\gate-check\gate-check.ps1 -Path .` | `./workflows/gate-check/gate-check.sh --path .` | `api-sync`, `commit-guard`, `env-audit`, `github-guard`, `guarded-change`, `java-maven-verify`, `merge-fix`, `node-workspace-release`, `release-guard`, `review-loop`, `security-review` |
| `github-check` | Inspect local GitHub Actions workflows and derive candidate required checks without changing remote settings. | `.\workflows\github-check\github-check.ps1 -Path .` | `./workflows/github-check/github-check.sh --path .` | `github-guard` |
| `governance-check` | Inspect current checkout governance files, agent directories, validation scripts, and git state. | `.\workflows\governance-check\governance-check.ps1 -Path .` | `./workflows/governance-check/governance-check.sh --path .` | `governance-audit`, `graph-audit` |
| `graph-check` | Inspect graph and MCP readiness signals without registering MCP servers, indexing repositories, or uploading code. | `.\workflows\graph-check\graph-check.ps1 -Path .` | `./workflows/graph-check/graph-check.sh --path .` | `graph-audit` |
| `maven-check` | Inspect Java and Maven readiness, root Maven metadata, wrapper presence, and user Maven mirror settings. | `.\workflows\maven-check\maven-check.ps1 -Path .` | `./workflows/maven-check/maven-check.sh --path .` | `java-maven-verify` |
| `merge-check` | Check unresolved files, conflict markers, cached diff health, and current merge state. | `.\workflows\merge-check\merge-check.ps1 -Path .` | `./workflows/merge-check/merge-check.sh --path .` | `merge-fix` |
| `node-workspace-check` | Inspect Node workspace metadata, package-manager commands, lockfiles, and validation or release scripts. | `.\workflows\node-workspace-check\node-workspace-check.ps1 -Path .` | `./workflows/node-workspace-check/node-workspace-check.sh --path .` | `node-workspace-release`, `release-guard` |
| `preflight` | Collect repository path, branch, HEAD, dirty state, staged/unstaged/untracked signals, and rule-file presence. | `.\workflows\preflight\preflight.ps1 -Path .` | `./workflows/preflight/preflight.sh --path .` | `api-sync`, `commit-guard`, `env-audit`, `governance-audit`, `graph-audit`, `guarded-change`, `review-loop`, `runtime-repair` |
| `release-check` | Inspect public release readiness signals without publishing, tagging, pushing, mutating versions, or creating artifacts. | `.\workflows\release-check\release-check.ps1 -Path .` | `./workflows/release-check/release-check.sh --path .` | `github-guard`, `release-guard`, `security-review` |
| `runtime-check` | Inspect local agent runtime prerequisites such as shell, PATH, package-manager commands, settings, and hook wrappers. | `.\workflows\runtime-check\runtime-check.ps1 -Path .` | `./workflows/runtime-check/runtime-check.sh --path .` | `env-audit`, `runtime-repair` |
| `security-check` | Scan local files for secret-like patterns and private path signals without printing sensitive values. | `.\workflows\security-check\security-check.ps1 -Path .` | `./workflows/security-check/security-check.sh --path .` | `release-guard`, `security-review` |
| `startup-check` | Inspect Windows startup sources such as Run keys, StartupApproved keys, and startup-like scheduled tasks. | `.\workflows\startup-check\startup-check.ps1 -Path .` | `./workflows/startup-check/startup-check.sh --path .` | `env-audit` |
