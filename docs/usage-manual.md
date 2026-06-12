# Usage Manual

1. Clone or copy the source repository.
2. Run validators for structure, Skills, and workflows.
3. Review the Skills and scripts you intend to install.
4. Install at user level for personal reuse or project level for repository-pinned behavior.
5. Prefer workflow runtime paths in prompts when deterministic checks are needed.

Use Skills for judgment-heavy work. Use workflows when you need stable JSON and repeatable checks.

For cross-project reuse, install guarded-change, review-loop, merge-fix, env-audit, and runtime-repair at user level. Install project-specific behavior at project level only after reviewing the target repository rules.

Use domain workflows as readonly probes before making changes:

- `runtime-check` for local agent runtime diagnosis.
- `maven-check` for Java/Maven verification readiness.
- `governance-check` for source-first governance audits.
- `node-workspace-check` for npm or pnpm workspace release readiness.
- `drift-check` for source-bound knowledge freshness.
- `startup-check` for Windows startup source enumeration.
