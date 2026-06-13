# Electron App Prerequisites

This checklist prepares a new computer to continue Agent Routines Manager development with the same capabilities. It separates host tools, Codex plugins, project dependencies, Agent Routines installation targets, and verification commands.

## Scope Rules

| Item type | Install scope | Repository policy |
| --- | --- | --- |
| OS tools and runtimes | Host or user level | Do not commit machine-specific paths. |
| Codex plugins and connectors | Codex user level | Do not copy plugin cache directories into this repository. |
| Electron app dependencies | Project level under `apps/agent-routines-manager` | Commit `package.json` and `package-lock.json`; do not commit `node_modules/`. |
| Agent Routines source Skills and workflows | Source repository | Maintain under `skills/` and `workflows/`. |
| Installed Agent Routines copies | User or project target | Treat as runtime targets, never source. |
| Secrets, signing identities, API keys | User, OS, or organization secret store | Never commit. |

## Host Tools

Install these before working on the Electron app:

| Tool | Required | Scope | Notes |
| --- | --- | --- | --- |
| Git | Yes | Host | Required for repository operations and executable-bit checks. |
| Node.js LTS and npm | Yes | Host | Use the project lockfile after installation. |
| PowerShell 7+ | Yes | Host | Required for cross-platform PowerShell validation. |
| Windows PowerShell 5.1 | Windows only | Host | Usually preinstalled on Windows. |
| Bash | Yes | Host | Use Git Bash or WSL on Windows. |
| Python 3 / `python3` | Yes | Host | Required by Bash helper paths and JSON checks. |
| Chrome or Chromium | Recommended | Host or user | Useful for UI QA and browser-based screenshots. |
| Windows signing certificate | Release only | User or organization | Required only for signed Windows releases. |
| macOS signing identity and notarization credentials | Release only | User or organization | Configure only on macOS or CI. |
| Linux packaging tools | Release only | Host or CI | Install per package target such as AppImage, deb, or rpm. |

Suggested checks:

```powershell
git --version
node --version
npm --version
pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
powershell -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
bash --version
python --version
python3 --version
```

```bash
git --version
node --version
npm --version
pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' || true
bash --version
python3 --version
```

## Codex User-Level Plugins

Install these in the Codex user environment, not in this repository:

| Plugin or capability | Required | Scope | Purpose |
| --- | --- | --- | --- |
| Build Web Apps | Yes | Codex user level | Renderer implementation, frontend testing guidance, and React patterns. |
| Browser | Yes | Codex user level | Open and inspect local renderer/dev-server targets. |
| imagegen | Recommended | Codex user level | Generate UI concept images and preview mockups. |
| playwright | Recommended | Codex user level | Renderer automation when Browser is unavailable. |
| Codex Security | Recommended | Codex user level | Security review for Electron IPC, command execution, and packaging. |
| GitHub | As needed | Codex user level | Pull request, issue, and CI inspection. |
| Chrome | As needed | Codex user level | Fallback when tests need the user's existing Chrome profile. |
| Figma connector | As needed | Codex user level | Figma design-to-code workflows when design files are introduced. |

Plugin installation rules:

1. Use the Codex plugin installation UI or an approved organization distribution path.
2. Install only exact plugin or connector matches.
3. Keep plugin cache and connector state outside the repository.
4. Re-run repository gates before relying on plugin-generated changes.

## Project-Level Dependencies

Install project dependencies from the committed lockfile:

```powershell
Set-Location apps\agent-routines-manager
npm ci
npx playwright install chromium
npm run check:deps
npm audit --audit-level=moderate
npm test
```

```bash
cd apps/agent-routines-manager
npm ci
npx playwright install chromium
npm run check:deps
npm audit --audit-level=moderate
npm test
```

The project-level dependency set includes:

| Package or capability | Scope | Purpose |
| --- | --- | --- |
| `electron` | Project dependency | Desktop runtime. |
| `electron-builder` | Project dev dependency | Packaging and release artifacts. |
| `react`, `react-dom` | Project dependency | Renderer UI. |
| `vite`, `typescript`, `@vitejs/plugin-react` | Project dev dependency | Renderer build and TypeScript workflow. |
| `i18next`, `react-i18next` | Project dependency | Simplified Chinese and English UI switching. |
| `electron-store` | Project dependency | Local app preferences such as theme and language. |
| `lucide-react` | Project dependency | UI icons. |
| `zod` | Project dependency | Runtime validation for IPC and config payloads. |
| `@playwright/test` | Project dev dependency | Browser and renderer interaction testing. |
| `vitest`, `jsdom` | Project dev dependency | Unit and DOM-oriented tests. |
| `eslint`, `prettier` | Project dev dependency | Linting and formatting. |

Expected app scripts after the scaffold phase:

| Script | Required by completion | Purpose |
| --- | --- | --- |
| `npm run dev` | Yes | Start the local Electron/Vite development loop. |
| `npm run build` | Yes | Build main, preload, and renderer output. |
| `npm run typecheck` | Yes | Run TypeScript checks without emitting output. |
| `npm run lint` | Yes | Run static lint checks. |
| `npm run format` | Yes | Check formatting. |
| `npm test` | Yes | Run unit and contract tests. |
| `npm run test:ui` | Yes, after browser install | Run renderer interaction tests. |
| `npm run check:deps` | Yes | Verify installed package metadata from the lockfile. |
| `npm run package` | Release readiness only | Run Electron Builder directory packaging, not signing or publishing. |
| `npm run dist` | Release only, explicit approval | Build distributable installers or archives. |

If the app source has not reached the scaffold phase yet, missing `dev`, `build`, or `typecheck` scripts are an implementation gap to close, not a host setup failure.

Do not commit:

- `apps/agent-routines-manager/node_modules/`
- Playwright browser cache
- Electron binary cache
- build output, release output, logs, coverage, or temporary files

## Project-Level Skills

These Skills are source-controlled under `skills/` and should be installed from this repository like other Agent Routines:

| Skill | Scope | Purpose |
| --- | --- | --- |
| `electron-app-builder` | Project source, then install target | Electron main/preload/renderer implementation guidance. |
| `desktop-packaging-release` | Project source, then install target | Desktop packaging and release readiness. |
| `desktop-qa` | Project source, then install target | Cross-platform Electron UI QA. |
| `desktop-design-system` | Project source, then install target | Desktop productivity design system and theme rules. |
| `i18n-checklist` | Project source, then install target | Simplified Chinese and English UI localization QA. |

Promote a project-level Skill to user-level reuse only after it proves useful across multiple repositories.

## Agent Routines Install Targets

Use these when you need the local host to have the repository's Skills and workflows installed:

| Target | Scope |
| --- | --- |
| `~/.codex/skills` | Codex user-level Skills |
| `~/.claude/skills` | Claude Code user-level Skills |
| `~/.agent-routines/workflows` | User-level workflow runtime |
| `<repo>/.codex/skills` | Codex project-level Skills |
| `<repo>/.claude/skills` | Claude Code project-level Skills |
| `<repo>/.agent-routines/workflows` | Project-level workflow runtime |

Install all source Skills and workflows on Windows:

```powershell
.\adapters\codex\install-user.ps1 -Force
.\adapters\claude-code\install-user.ps1 -Force
.\adapters\codex\install-project.ps1 -ProjectPath . -Force
.\adapters\claude-code\install-project.ps1 -ProjectPath . -Force
```

Install all source Skills and workflows on macOS/Linux or Bash:

```bash
./adapters/codex/install-user.sh --force
./adapters/claude-code/install-user.sh --force
./adapters/codex/install-project.sh --project-path . --force
./adapters/claude-code/install-project.sh --project-path . --force
```

The installed target folders are runtime copies. Do not edit them as source and do not commit project-level runtime folders.

## Verification

Run repository gates:

```powershell
.\tests\validate-structure.ps1
.\tests\validate-skills.ps1
.\tests\validate-workflows.ps1
.\tests\validate-docs.ps1
.\tests\validate-changelog.ps1
.\tests\validate-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\tools\install-discovery.config.example.json
.\tests\run-workflows.ps1
```

```bash
./tests/validate-structure.sh
./tests/validate-skills.sh
./tests/validate-workflows.sh
./tests/validate-docs.sh
./tests/validate-changelog.sh
./tests/validate-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
./tests/validate-install-discovery-config.sh --config-path ./tools/install-discovery.config.example.json
./tests/run-workflows.sh
```

Check installed Agent Routines:

```powershell
.\adapters\codex\check-user.ps1
.\adapters\claude-code\check-user.ps1
.\adapters\codex\check-project.ps1 -ProjectPath .
.\adapters\claude-code\check-project.ps1 -ProjectPath .
```

```bash
./adapters/codex/check-user.sh
./adapters/claude-code/check-user.sh
./adapters/codex/check-project.sh --project-path .
./adapters/claude-code/check-project.sh --project-path .
```

Check dependency installation:

```powershell
Set-Location apps\agent-routines-manager
npm run check:deps
npm audit --audit-level=moderate
npm test
npx playwright --version
npx electron --version
```

Expected healthy state:

- All source Skills are installed in selected user and project targets.
- All workflows are installed in selected workflow runtime targets.
- `check-install` reports `0 drifted` and `0 broken` for managed source items.
- `npm audit --audit-level=moderate` reports no vulnerabilities.
- Repository validators pass.
- `git diff --check` and `git diff --cached --check` pass before commit.

Network-dependent checks:

- `npm ci`, `npm audit`, `npx playwright install chromium`, and Electron binary installation may require registry or CDN access.
- If those commands fail only because the registry, proxy, CDN, or credentials are unavailable, record the exact external blocker and continue with checks that do not require network access.
- Do not replace the committed lockfile or switch package managers just to work around a transient network failure.

## Platform Notes

- On Windows, PowerShell checks use the Windows home directory. Bash or WSL may use a different `$HOME`, so user-level install targets can differ.
- On macOS/Linux, PowerShell 7 may be absent. Bash gates should still run; PowerShell gates require installing `pwsh`.
- macOS signing and notarization cannot be fully prepared on Windows.
- Linux package formats should be validated on the matching distro or CI runner.
- Browser and Electron binary caches are user-level runtime data and should remain outside the repository.
