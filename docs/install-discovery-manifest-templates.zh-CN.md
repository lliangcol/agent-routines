# Install Discovery Manifest 模板

本仓库提供一组脱敏后的 install-discovery config 模板，用于常见本机项目类型。这些模板基于已配置项目根目录的本机扫描结果生成，但不会写入私有项目名、业务名、仓库 URL 或具体项目路径。

## 本机扫描摘要

扫描范围只包含以下已确认根目录：

- `D:\Repositories`
- `D:\Work\Projects`

扫描依据限于仓库级技术标记，例如 `.git`、`package.json`、`pyproject.toml`、`requirements.txt`、`pom.xml`、`build.gradle`、`docs/`、`skills/`、`workflows/`、`apps/` 和 `packages/`。

观察到的脱敏项目类型：

| 类型 | 判断信号 | 本机近似匹配数 | 模板 |
| --- | --- | ---: | --- |
| Agent routine library | `skills/`、`workflows/`、`.agent-routines/`、agent workflow 源文件 | 3 | `tools/install-discovery-manifests/agent-routine-library.config.json` |
| Desktop Electron app | Electron 应用或桌面应用构建信号，常见于 Node workspace 内 | 1 | `tools/install-discovery-manifests/desktop-electron-app.config.json` |
| Documentation knowledge base | `docs/`、`wiki/`、Markdown 密集仓库、轻量脚本 | 12 | `tools/install-discovery-manifests/documentation-knowledge-base.config.json` |
| Java Maven service | `pom.xml`、Gradle 文件、Java 服务脚本 | 5 | `tools/install-discovery-manifests/java-maven-service.config.json` |
| Node workspace | `package.json`、`apps/`、`packages/`、Vite/Next/React/plugin tooling | 6 | `tools/install-discovery-manifests/node-workspace.config.json` |
| Python tooling | `pyproject.toml`、`requirements.txt`、`src/`、`tests/`、自动化脚本 | 6 | `tools/install-discovery-manifests/python-tooling.config.json` |
| Workstation config | Shell/editor/agent 配置仓库和本机环境文档 | 1 | `tools/install-discovery-manifests/workstation-config.config.json` |

数量刻意保持为近似值，因为同一个仓库可能同时匹配多个类型。

## 使用方式

1. 选择最匹配目标项目类型的模板。
2. 复制到已审查的工作配置路径，例如 `.agent-routines/install-discovery.config.json`。
3. 将占位的 `projectTargets[0].path` 替换为具体项目路径。
4. 除非本次 review 明确批准用户级安装，否则保持 `userTargets.enabled` 为 `false`。
5. 生成计划前先校验配置：

```powershell
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tests/validate-install-discovery-config.sh --config-path ./.agent-routines/install-discovery.config.json
```

6. 生成 dry-run 计划：

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -ApplyMode dry-run
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --mode dry-run
```

## 模板边界

- 模板是 desired-state 输入，不是已经生成的安装 manifest。
- 模板默认使用带占位路径的显式 `projectTargets`，不会默认扫描全部本机根目录。
- `createTargets` 为 `false`，缺失的项目级目录会被报告，而不是自动创建。
- `mode` 为 `merge`；破坏性模式需要单独的已审查请求。
- 未知已安装项保持 `report-only`。
- 用户级 target 默认禁用，避免把项目特定需求误提升为用户级安装。

## 选择指南

项目本身维护 Skills、workflows、adapters 或 install-discovery 工具时，使用 `agent-routine-library`。

Electron 桌面应用，或 Node workspace 内的 Electron package，使用 `desktop-electron-app`。

Markdown 密集的知识库、文档包、提示词库和轻量脚本仓库，使用 `documentation-knowledge-base`。

带 Maven 或 Gradle 校验的 Java 服务仓库，使用 `java-maven-service`。

JavaScript 或 TypeScript package、monorepo、前端应用、插件和 package release workflow，使用 `node-workspace`。

Python CLI、自动化项目、治理工具和 pytest 支撑的库，使用 `python-tooling`。

编辑器、终端、Shell 和本机配置仓库，使用 `workstation-config`。
