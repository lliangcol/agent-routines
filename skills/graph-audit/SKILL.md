---
name: graph-audit
description: Use this skill for codebase graph and MCP readiness checks where indexing scope, project names, tool availability, and fallback discovery must be explicit.
os: cross-platform
---

# graph-audit

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. MCP and graph tools may be globally available while project instructions remain repo-local. Keep those scopes separate.

## Flow

1. Read repo-local discovery instructions. 2. Run graph-check. 3. Determine whether graph tools are available and whether the current project is indexed. 4. Use graph discovery first when available. 5. Fall back to filesystem search when graph coverage is absent or insufficient. 6. Report the evidence boundary.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: graph-check, preflight, governance-check

## Human Confirmation Gates

Ask before indexing large repositories, registering MCP servers, changing global agent instructions, installing graph tooling, or uploading code.

## Failure Routing

If graph tools are unavailable or unindexed, fall back to targeted readonly file inspection and label graph-derived claims as unavailable.
