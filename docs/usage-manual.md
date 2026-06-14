# Usage Manual

1. Clone or copy the source repository.
2. Run validators for structure, Skills, and workflows.
3. Review the Skills and scripts you intend to install.
4. Install at user level for personal reuse or project level for repository-pinned behavior.
5. Prefer workflow runtime paths in prompts when deterministic checks are needed.

Use Skills for judgment-heavy work. Use workflows when you need stable JSON and repeatable checks.

For code discovery, use codebase-memory-mcp graph tools first when this repository is indexed. If the graph is unavailable or incomplete, fall back to `rg` or direct file reading and note that fallback in the result. Do not treat graph output as a generated source of truth; the maintained source remains the files in this repository.

For a complete inventory, see [Routine Catalog](catalog.md). For prompt and command examples, see [Routine Examples](examples.md).

For cross-project reuse, install the broadly reusable Skills from the manifest at user level: guarded-change, review-loop, merge-fix, env-audit, runtime-repair, commit-guard, prompt-qa, release-guard, security-review, github-guard, and graph-audit. Install project-specific behavior at project level only after reviewing the target repository rules.

Before broad installation or reinstallation, run installer dry-run mode and review the target list. PowerShell installers use `-WhatIf`; Bash installers use `--dry-run`. For multi-project distribution, prefer install discovery config v2 and review the generated `actions[]` before Apply. Dry-run mode must not create target directories, copy files, delete files, or replace installed content.

Use domain workflows as readonly probes before making changes:

- `runtime-check` for local agent runtime diagnosis.
- `maven-check` for Java/Maven verification readiness.
- `governance-check` for source-first governance audits.
- `node-workspace-check` for npm or pnpm workspace release readiness.
- `drift-check` for source-bound knowledge freshness.
- `startup-check` for Windows startup source enumeration.
