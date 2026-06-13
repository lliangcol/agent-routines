# Agent Routines

Agent Routines 是一个可版本化、适合托管在 GitHub 的源代码仓库，用于维护可复用的 AI Agent Skills、确定性工作流、安装适配器、使用手册、校验脚本和 Mermaid 图表。源代码仓库是维护层面的唯一事实来源。Codex 和 Claude Code 的用户级或项目级目录只是安装目标。

## 分层模型

- Skills 负责判断、编排、风险边界、人工确认点和失败路由。
- Workflows 负责确定性、可重复、可测试的脚本执行。
- Adapters 将 Skills 和 workflows 复制到特定工具的用户级或项目级位置。
- 文档记录兼容性、安全边界、命名、分发和编写规则。

## 快速开始

在源仓库根目录运行：

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

`validate-docs` 检查中英文文档配对和目录一致性。`validate-changelog` 检查 CHANGELOG 版本与 `vX.Y.Z` git tag 的一致性。`run-workflows` 在临时 fixture 仓库上执行每个 workflow、校验 JSON 输出契约，并在对应 shell 可用时断言 sh 与 ps1 实现的一致性。同样的门禁会在 CI 的 Ubuntu、macOS 和 Windows（PowerShell 7 与 Windows PowerShell 5.1）上运行，另有 gitleaks 密钥扫描。

## Codex 用户级安装

```powershell
.\adapters\codex\install-user.ps1
```

```bash
./adapters/codex/install-user.sh
```

## Claude Code 用户级安装

```powershell
.\adapters\claude-code\install-user.ps1
```

```bash
./adapters/claude-code/install-user.sh
```

## 项目级安装

```powershell
.\adapters\codex\install-project.ps1 -ProjectPath C:\path\to\repo
.\adapters\claude-code\install-project.ps1 -ProjectPath C:\path\to\repo
```

```bash
./adapters/codex/install-project.sh --project-path /path/to/repo
./adapters/claude-code/install-project.sh --project-path /path/to/repo
```

## 工作流运行时安装

安装器默认将 workflows 复制到：

- 用户运行时：`~/.agent-routines/workflows`
- 项目运行时：`.agent-routines/workflows`

使用 `-SkipWorkflows` 或 `--skip-workflows` 只安装 Skills。使用 `-WorkflowsOnly` 或 `--workflows-only` 只安装 workflows。

## Manifest 安装

当你需要用一个经过审阅的 JSON 清单统一决定哪些 Skills 和 workflows 安装到用户级和项目级目标时，使用 manifest 模式。

```powershell
.\adapters\codex\install-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
.\adapters\claude-code\install-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
```

```bash
./adapters/codex/install-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
./adapters/claude-code/install-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
```

Manifest 模式只复制清单中列出的 Skill 和 workflow 目录。它不会移除 manifest 中不存在的已安装内容。使用 `-Force` 或 `--force` 替换已经存在的目标目录。

进行大范围或团队安装前，先运行一次安装器 dry-run 并审阅目标路径。PowerShell 安装器使用 `-WhatIf`，Bash 安装器使用 `--dry-run`。

当一台机器上已经在已知项目根目录中分散安装了用户级和项目级内容时，应基于配置生成经过审阅的 manifest 计划，而不是扫描全盘：

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json
```

详见 `docs/install-discovery.zh-CN.md` 和 `tools/install-discovery.config.example.json`。生成器默认 dry-run；只有传入 `-WriteManifest -Apply` 或 `--write-manifest --apply` 才执行安装。

## 安装自检

安装后可对照源仓库校验已安装 Skills 和 workflows 的完整性。该检查是只读的：结果分为 `ok`、`drift`（内容与源仓库不一致，通常是旧版本）和 `broken`（文件缺失），只有出现 `broken` 时退出码非零。

```powershell
.\adapters\claude-code\check-user.ps1
.\adapters\claude-code\check-project.ps1 -ProjectPath C:\path\to\repo
.\adapters\codex\check-user.ps1
```

```bash
./adapters/claude-code/check-user.sh
./adapters/claude-code/check-project.sh --project-path /path/to/repo
./adapters/codex/check-user.sh
```

## 已包含例行能力

本仓库包含用于受控改动、已验证提交、提示词 QA、review 循环、merge 修复、API 同步、DMS 修复、支付文档、环境审计、运行时修复、Maven 验证、治理审计、归档记录、Node 工作区发布、Electron 应用构建、桌面打包、桌面 QA、桌面设计系统、i18n 检查、公开发布就绪、安全审查、GitHub 策略规划、graph 审计和知识漂移检查的 Skills。

workflow 运行时包含针对 preflight 状态、门禁、提交、发布、安全发现、GitHub workflow 证据、graph 就绪、merge、归档、数据库 SQL 形态、文档、运行时、Maven、治理状态、Node 工作区、知识漂移和 Windows 启动项的只读检查。

## 目录结构

- `skills/`：工具中立的 Skill 目录，包含 `SKILL.md`、README 和 references。
- `workflows/`：确定性工作流脚本、schema 和示例输出。
- `adapters/`：Codex 和 Claude Code 的安装器与卸载器。
- `distribution/`：经过审阅的用户级和项目级分发 manifest 示例。
- `docs/`：架构、分发、兼容性、安全、图表、编写手册、Electron 应用执行规范、UI 设计契约、提前安装清单和发布流程。
- `tests/`：PowerShell 和 Bash 版本的结构、Skill、workflow 和 manifest 校验器。
- `tools/`：基于配置的 manifest 发现和安装计划工具。

## 安全边界

脚本不得默认执行破坏性操作。数据库写入、生产配置、commit/push、删除、外部发布和 DMS 执行都需要人工确认。安装前请审阅 Skills，尤其是在安装到多个项目共享的用户级目录时。

公开发布必须包含 `SECURITY.md` 和 `SUPPORT.md`，并且打 tag 前应以 public 模式运行 `release-check`（`-Public` 或 `--public`）。

## 跨平台支持摘要

支持的目标包括：Windows 10/11 搭配 Windows PowerShell 5.1 和 PowerShell 7+，macOS 搭配 Bash 和 PowerShell 7+，Linux 搭配 Bash 和 PowerShell 7+。Markdown Skills 是跨平台的。操作系统特定行为应以受保护的配置档案、文档化的回退路径或适配器特定逻辑呈现。
