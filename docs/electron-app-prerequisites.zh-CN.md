# Electron 应用提前安装和准备清单

本文档用于在新电脑上复刻 Agent Routines Manager 开发环境，确保后续可以使用相同能力继续开发。清单区分宿主机工具、Codex 插件、项目依赖、Agent Routines 安装目标和验证命令。

## 范围规则

| 类型 | 安装范围 | 仓库策略 |
| --- | --- | --- |
| OS 工具和运行时 | 宿主机或用户级 | 不提交机器特定路径。 |
| Codex 插件和 connector | Codex 用户级 | 不把插件缓存目录复制进本仓库。 |
| Electron 应用依赖 | `apps/agent-routines-manager` 项目级 | 提交 `package.json` 和 `package-lock.json`；不提交 `node_modules/`。 |
| Agent Routines 源 Skills 和 workflows | 源仓库 | 在 `skills/` 和 `workflows/` 中维护。 |
| 已安装的 Agent Routines 副本 | 用户级或项目级目标 | 作为运行时目标，不作为源。 |
| secrets、签名身份、API keys | 用户、OS 或组织密钥存储 | 永不提交。 |

## 宿主机工具

开发 Electron 应用前先安装：

| 工具 | 是否必需 | 范围 | 说明 |
| --- | --- | --- | --- |
| Git | 必需 | 宿主机 | 仓库操作和 executable-bit 检查需要。 |
| Node.js LTS 和 npm | 必需 | 宿主机 | 安装后使用项目 lockfile。 |
| PowerShell 7+ | 必需 | 宿主机 | 跨平台 PowerShell 校验需要。 |
| Windows PowerShell 5.1 | 仅 Windows 必需 | 宿主机 | Windows 通常自带。 |
| Bash | 必需 | 宿主机 | Windows 使用 Git Bash 或 WSL。 |
| Python 3 / `python3` | 必需 | 宿主机 | Bash helper 路径和 JSON 检查需要。 |
| Chrome 或 Chromium | 建议 | 宿主机或用户级 | UI QA 和浏览器截图有用。 |
| Windows 签名证书 | 仅发布需要 | 用户或组织级 | 只有签名 Windows 发布时需要。 |
| macOS 签名身份和 notarization 凭证 | 仅发布需要 | 用户或组织级 | 只在 macOS 或 CI 上配置。 |
| Linux 打包工具 | 仅发布需要 | 宿主机或 CI | 按 AppImage、deb、rpm 等目标安装。 |

建议检查命令：

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

## Codex 用户级插件

这些插件安装到 Codex 用户环境，不安装到本仓库：

| 插件或能力 | 是否必需 | 范围 | 用途 |
| --- | --- | --- | --- |
| Build Web Apps | 必需 | Codex 用户级 | renderer 实现、前端测试指导和 React 模式。 |
| Browser | 必需 | Codex 用户级 | 打开并检查本地 renderer/dev-server 目标。 |
| imagegen | 建议 | Codex 用户级 | 生成 UI 概念图和界面预览图。 |
| playwright | 建议 | Codex 用户级 | Browser 不可用时做 renderer 自动化。 |
| Codex Security | 建议 | Codex 用户级 | 审查 Electron IPC、命令执行和打包。 |
| GitHub | 按需 | Codex 用户级 | PR、issue 和 CI 检查。 |
| Chrome | 按需 | Codex 用户级 | 测试需要用户现有 Chrome profile 时使用。 |
| Figma connector | 按需 | Codex 用户级 | 引入 Figma 设计稿时做设计到代码工作流。 |

插件安装规则：

1. 使用 Codex 插件安装 UI 或组织批准的分发路径。
2. 只安装精确匹配的 plugin 或 connector。
3. 插件缓存和 connector 状态必须留在仓库外。
4. 依赖插件生成的变更前重新运行仓库门禁。

## 项目级依赖

从已提交的 lockfile 安装项目依赖：

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

项目级依赖集合包含：

| 包或能力 | 范围 | 用途 |
| --- | --- | --- |
| `electron` | 项目依赖 | 桌面运行时。 |
| `electron-builder` | 项目 dev dependency | 打包和发布产物。 |
| `react`, `react-dom` | 项目依赖 | renderer UI。 |
| `vite`, `typescript`, `@vitejs/plugin-react` | 项目 dev dependency | renderer 构建和 TypeScript workflow。 |
| `i18next`, `react-i18next` | 项目依赖 | 简体中文和英文 UI 切换。 |
| `electron-store` | 项目依赖 | 主题、语言等本地应用偏好。 |
| `lucide-react` | 项目依赖 | UI 图标。 |
| `zod` | 项目依赖 | IPC 和配置 payload 的运行时校验。 |
| `@playwright/test` | 项目 dev dependency | 浏览器和 renderer 交互测试。 |
| `vitest`, `jsdom` | 项目 dev dependency | 单元测试和 DOM 测试。 |
| `eslint`, `prettier` | 项目 dev dependency | lint 和格式检查。 |

Scaffold 阶段之后预期存在的应用 scripts：

| Script | 完成时是否必需 | 用途 |
| --- | --- | --- |
| `npm run dev` | 必需 | 启动本地 Electron/Vite 开发循环。 |
| `npm run build` | 必需 | 构建 main、preload 和 renderer 输出。 |
| `npm run typecheck` | 必需 | 运行 TypeScript 检查且不产生输出。 |
| `npm run lint` | 必需 | 运行静态 lint 检查。 |
| `npm run format` | 必需 | 检查格式。 |
| `npm test` | 必需 | 运行单元和契约测试。 |
| `npm run test:ui` | 安装 browser 后必需 | 运行 renderer 交互测试。 |
| `npm run check:deps` | 必需 | 根据 lockfile 校验已安装 package metadata。 |
| `npm run package` | 仅发布就绪阶段 | 运行 Electron Builder 目录打包，不签名也不发布。 |
| `npm run dist` | 仅发布阶段，需明确批准 | 构建可分发安装包或压缩包。 |

如果应用源码尚未进入 scaffold 阶段，缺失 `dev`、`build` 或 `typecheck` scripts 是需要补齐的实现缺口，不是宿主机设置失败。

不要提交：

- `apps/agent-routines-manager/node_modules/`
- Playwright 浏览器缓存
- Electron binary 缓存
- build output、release output、logs、coverage 或临时文件

## 项目级 Skills

这些 Skills 作为源内容维护在 `skills/` 下，并像其它 Agent Routines 一样从本仓库安装：

| Skill | 范围 | 用途 |
| --- | --- | --- |
| `electron-app-builder` | 项目源内容，然后安装到目标 | Electron main/preload/renderer 实现指导。 |
| `desktop-packaging-release` | 项目源内容，然后安装到目标 | 桌面打包和发布就绪检查。 |
| `desktop-qa` | 项目源内容，然后安装到目标 | 跨平台 Electron UI QA。 |
| `desktop-design-system` | 项目源内容，然后安装到目标 | 桌面生产力设计系统和主题规则。 |
| `i18n-checklist` | 项目源内容，然后安装到目标 | 简体中文和英文 UI 本地化 QA。 |

只有当某个项目级 Skill 对多个仓库都有复用价值时，才提升为用户级复用。

## Agent Routines 安装目标

需要让本机安装本仓库的 Skills 和 workflows 时，使用这些目标：

| 目标 | 范围 |
| --- | --- |
| `~/.codex/skills` | Codex 用户级 Skills |
| `~/.claude/skills` | Claude Code 用户级 Skills |
| `~/.agent-routines/workflows` | 用户级 workflow runtime |
| `<repo>/.codex/skills` | Codex 项目级 Skills |
| `<repo>/.claude/skills` | Claude Code 项目级 Skills |
| `<repo>/.agent-routines/workflows` | 项目级 workflow runtime |

在 Windows 安装全部源 Skills 和 workflows：

```powershell
.\adapters\codex\install-user.ps1 -Force
.\adapters\claude-code\install-user.ps1 -Force
.\adapters\codex\install-project.ps1 -ProjectPath . -Force
.\adapters\claude-code\install-project.ps1 -ProjectPath . -Force
```

在 macOS/Linux 或 Bash 中安装全部源 Skills 和 workflows：

```bash
./adapters/codex/install-user.sh --force
./adapters/claude-code/install-user.sh --force
./adapters/codex/install-project.sh --project-path . --force
./adapters/claude-code/install-project.sh --project-path . --force
```

已安装目标目录是运行时副本。不要把它们当成源来编辑，也不要提交项目级运行时目录。

## 验证

运行仓库门禁：

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

检查已安装的 Agent Routines：

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

检查依赖安装：

```powershell
Set-Location apps\agent-routines-manager
npm run check:deps
npm audit --audit-level=moderate
npm test
npx playwright --version
npx electron --version
```

健康状态预期：

- 所有源 Skills 已安装到选定的用户级和项目级目标。
- 所有 workflows 已安装到选定的 workflow runtime 目标。
- `check-install` 对受管理源内容报告 `0 drifted` 和 `0 broken`。
- `npm audit --audit-level=moderate` 没有漏洞。
- 仓库验证器全部通过。
- 提交前 `git diff --check` 和 `git diff --cached --check` 通过。

依赖网络的检查：

- `npm ci`、`npm audit`、`npx playwright install chromium` 和 Electron binary 安装可能需要 registry 或 CDN 访问。
- 如果这些命令只是因为 registry、proxy、CDN 或凭证不可用而失败，记录精确外部 blocker，并继续执行不依赖网络的检查。
- 不要仅为绕过临时网络失败而替换已提交 lockfile 或切换 package manager。

## 平台说明

- Windows 上，PowerShell 检查使用 Windows home 目录。Bash 或 WSL 可能使用不同 `$HOME`，因此用户级安装目标可能不同。
- macOS/Linux 上可能没有 PowerShell 7。Bash 门禁仍应运行；PowerShell 门禁需要安装 `pwsh`。
- macOS signing 和 notarization 无法在 Windows 上完整准备。
- Linux 包格式应在匹配发行版或 CI runner 上验证。
- Browser 和 Electron binary 缓存是用户级运行时数据，应留在仓库外。
