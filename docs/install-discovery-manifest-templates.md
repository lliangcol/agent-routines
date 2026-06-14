# Install Discovery Manifest Templates

This repository includes sanitized install-discovery config templates for common local project types. They are based on a local scan of the configured project roots, but they do not embed private project names, business names, repository URLs, or concrete project paths.

## Local Scan Summary

The scan covered only these reviewed roots:

- `D:\Repositories`
- `D:\Work\Projects`

The scan used repository-level technical markers such as `.git`, `package.json`, `pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle`, `docs/`, `skills/`, `workflows/`, `apps/`, and `packages/`.

Observed sanitized project categories:

| Category | Signals | Approximate local matches | Template |
| --- | --- | ---: | --- |
| Agent routine library | `skills/`, `workflows/`, `.agent-routines/`, agent workflow source files | 3 | `tools/install-discovery-manifests/agent-routine-library.config.json` |
| Desktop Electron app | Electron app or desktop-app build signals, often inside a Node workspace | 1 | `tools/install-discovery-manifests/desktop-electron-app.config.json` |
| Documentation knowledge base | `docs/`, `wiki/`, Markdown-heavy repositories, lightweight scripts | 12 | `tools/install-discovery-manifests/documentation-knowledge-base.config.json` |
| Java Maven service | `pom.xml`, Gradle files, Java service scripts | 5 | `tools/install-discovery-manifests/java-maven-service.config.json` |
| Node workspace | `package.json`, `apps/`, `packages/`, Vite/Next/React/plugin tooling | 6 | `tools/install-discovery-manifests/node-workspace.config.json` |
| Python tooling | `pyproject.toml`, `requirements.txt`, `src/`, `tests/`, automation scripts | 6 | `tools/install-discovery-manifests/python-tooling.config.json` |
| Workstation config | Shell/editor/agent configuration repositories and local environment docs | 1 | `tools/install-discovery-manifests/workstation-config.config.json` |

Counts are intentionally approximate because a repository can match more than one category.

## How To Use

1. Choose the template that best matches the target project type.
2. Copy it to a reviewed working config path, for example `.agent-routines/install-discovery.config.json`.
3. Replace the placeholder `projectTargets[0].path` value with the concrete project path.
4. Keep `userTargets.enabled` as `false` unless the same review explicitly approves user-level installs.
5. Validate the selected config before generating a plan:

```powershell
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tests/validate-install-discovery-config.sh --config-path ./.agent-routines/install-discovery.config.json
```

6. Generate a dry-run plan:

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -ApplyMode dry-run
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --mode dry-run
```

## Template Boundaries

- Templates are desired-state inputs, not generated install manifests.
- Templates use explicit `projectTargets` with placeholder paths instead of scanning all local roots by default.
- `createTargets` is `false` so missing project-level folders are reported rather than created.
- `mode` is `merge`; destructive modes require a separate reviewed request.
- Unknown installed items remain `report-only`.
- User-level targets are disabled by default to avoid accidental promotion from project-specific needs.

## Selection Guide

Use `agent-routine-library` when the project itself maintains Skills, workflows, adapters, or install-discovery tooling.

Use `desktop-electron-app` for Electron desktop applications or Electron packages inside a Node workspace.

Use `documentation-knowledge-base` for Markdown-heavy knowledge bases, documentation packs, prompt libraries, and light scripting repositories.

Use `java-maven-service` for Java service repositories with Maven or Gradle validation.

Use `node-workspace` for JavaScript or TypeScript packages, monorepos, frontend apps, plugins, and package-release workflows.

Use `python-tooling` for Python CLIs, automation projects, governance tools, and pytest-backed libraries.

Use `workstation-config` for editor, terminal, shell, and local machine configuration repositories.
