# java-maven-verify

## Use Cases

Targeted Maven tests, module-scoped verification, dependency resolution diagnosis, mirror override review, and Windows PowerShell Maven command construction.

## Non-Use Cases

Dependency upgrades, production profile execution, or broad build-system changes without explicit approval.

## Supported OS

Windows, macOS, and Linux. Windows examples should quote `-D...` arguments when used from PowerShell.

## Inputs

Repo path, module, test selector, Maven command, Java version expectation, profiles, and any dependency resolution error.

## Outputs

Readonly environment findings, recommended command, mirror risk classification, verification result, and unresolved blockers.

## Execution Steps

Run maven-check, inspect `pom.xml` and module paths, construct a narrow command, run approved validation, and report exact output boundaries.

## Human Confirmation Points

Changing Maven settings, adding dependencies, running production profiles, deleting local caches, or broadening test scope.

## Failure Handling

When dependency resolution fails, inspect user-level Maven mirrors before assuming repository code is broken.

## Example Prompts

- "Run the targeted Maven test for this class; quote PowerShell args correctly."
- "Explain whether this 502 is a repo problem or a Maven mirror issue."

## Recommended Workflows

maven-check, gate-check
