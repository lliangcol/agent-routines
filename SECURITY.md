# Security Policy

## Supported Versions

Agent Routines is versioned as one routine library. Public consumers should install from a reviewed `vX.Y.Z` tag instead of `main`. Security fixes are published in the next tagged release unless the maintainer decides a private handoff is safer.

## Reporting A Vulnerability

Do not open a public issue with secrets, exploit steps against a third-party system, or private repository paths. Contact the maintainer directly through the repository owner profile or a private GitHub security advisory when available.

Include:

- Affected Skill, workflow, adapter, or documentation path.
- Exact version, tag, or commit reviewed.
- Impact and required privileges.
- Minimal reproduction steps that do not expose real secrets or production data.

## Handling Sensitive Values

Redact credentials, tokens, internal hostnames, customer data, and private file paths before sharing evidence. If a real secret was committed or installed, rotate it outside this repository first, then report the affected path and commit range.

## Scope

In scope: repository scripts, install adapters, manifest distribution, workflow safety boundaries, and public release artifacts.

Out of scope: vulnerabilities in an agent runtime, GitHub, package managers, operating systems, or third-party tools invoked by a user outside these routines.

## Response Expectations

This project does not promise a fixed SLA. The maintainer will triage based on exploitability, exposure, and release impact, then document the fix in `CHANGELOG.md` when disclosure is safe.
