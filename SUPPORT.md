# Support

## Where To Start

Use repository issues or pull requests for public, non-sensitive questions about Skills, workflows, documentation, and install adapters. Use the private security process in `SECURITY.md` for vulnerabilities or sensitive evidence.

## What To Include

For workflow or adapter problems, include:

- Operating system and shell.
- Command run and exit code.
- Redacted JSON output or error text.
- Repository tag or commit.
- Whether the target was user-level, project-level, or manifest installation.

## Support Boundaries

This repository supports the routines it ships. It does not provide support for private business systems, production database access, agent vendor incidents, package manager outages, or credentials that must be rotated outside this repository.

## Escalation

If a routine blocks a release, installation, or security review, include the exact validation gate that failed and the smallest reproducible case. The maintainer may ask for a sanitized archive record under the documented `executions/` layout.
