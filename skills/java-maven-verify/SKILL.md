---
name: java-maven-verify
description: Use this skill for Java Maven verification where module scope, PowerShell argument quoting, user Maven mirrors, and targeted tests must be handled explicitly.
os: cross-platform
---

# java-maven-verify

Use this Skill when the situation matches the frontmatter description. It is cross-platform and tool-neutral: judgment, sequencing, risk boundaries, and human confirmation points live here; deterministic checks should be delegated to installed workflow runtime paths first, then to source repository paths when the runtime is not installed.

## Operating System Support

`os: cross-platform`. Windows PowerShell command construction must quote Maven `-D` properties; POSIX shells should still preserve module and test selectors exactly.

## Flow

1. Identify module, test class, method, and profile boundary. 2. Run readonly Maven environment checks. 3. Inspect mirror settings when dependency resolution fails. 4. Build the narrowest verification command. 5. Run only authorized tests. 6. Report exact command and outcome.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: maven-check, gate-check

## Human Confirmation Gates

Ask before changing `settings.xml`, adding dependencies, using production profiles, broad module builds, or creating local settings overrides outside ignored build output.

## Failure Routing

Separate repo test failures from local Maven mirror, Java runtime, and shell quoting failures before changing source code.
