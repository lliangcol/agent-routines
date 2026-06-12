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
.\tests\validate-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
```

```bash
./tests/validate-structure.sh
./tests/validate-skills.sh
./tests/validate-workflows.sh
./tests/validate-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
```

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

## 目录结构

- `skills/`：工具中立的 Skill 目录，包含 `SKILL.md`、README 和 references。
- `workflows/`：确定性工作流脚本、schema 和示例输出。
- `adapters/`：Codex 和 Claude Code 的安装器与卸载器。
- `docs/`：架构、分发、兼容性、安全、图表和编写手册。
- `tests/`：PowerShell 和 Bash 版本的结构、Skill、workflow 和 manifest 校验器。

## 安全边界

脚本不得默认执行破坏性操作。数据库写入、生产配置、commit/push、删除、外部发布和 DMS 执行都需要人工确认。安装前请审阅 Skills，尤其是在安装到多个项目共享的用户级目录时。

## 跨平台支持摘要

支持的目标包括：Windows 10/11 搭配 Windows PowerShell 5.1 和 PowerShell 7+，macOS 搭配 Bash 和 PowerShell 7+，Linux 搭配 Bash 和 PowerShell 7+。Markdown Skills 是跨平台的。操作系统特定行为应以受保护的配置档案、文档化的回退路径或适配器特定逻辑呈现。
