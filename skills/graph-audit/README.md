# graph-audit

## Use Cases

MCP graph readiness, codebase-memory project indexing checks, graph-first discovery boundaries, global-vs-project instruction scope, and fallback planning.

## Non-Use Cases

Registering MCP servers, indexing large repositories, changing global configuration, or relying on stale graph data without verification.

## Supported OS

Windows, macOS, and Linux. Tool availability may vary by shell and installed agent runtime.

## Inputs

Repo path, project name, local agent instructions, available MCP tools, and desired discovery task.

## Outputs

Graph availability status, project indexing status, project-name candidates, fallback path, and confidence boundary.

## Execution Steps

Run graph-check, inspect local instructions, use graph tools when available, fall back to targeted file inspection when not, and report the source of each claim.

## Human Confirmation Points

Indexing repositories, editing global instructions, registering MCP tools, or installing dependencies.

## Failure Handling

If graph evidence is missing, avoid claiming architecture coverage and continue with explicit fallback discovery.

## Example Prompts

- "Check whether this project is indexed before using graph discovery."
- "Separate global MCP availability from repo-local graph-first instructions."

## Recommended Workflows

graph-check, preflight, governance-check
