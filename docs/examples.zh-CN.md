# 例行能力使用示例

这些示例展示如何用自然语言触发 Skills，以及如何从源仓库直接运行 workflows。Skills 不是命令行程序；它们用于 agent 路由、判断和边界控制。

## Skill 提示词示例

| Skill | 示例提示词 |
|---|---|
| `api-sync` | “使用 `api-sync` 对比后端 DTO 变更，并更新前端 wrappers、types、enums 和受影响 UI，最后做最小验证。” |
| `archive-record` | “使用 `archive-record` 创建持久执行记录，保存 evidence 和 artifacts，并验证归档布局。” |
| `commit-guard` | “使用 `commit-guard` 验证当前变更，只暂存目标范围，干净后创建本地提交，不要 push。” |
| `desktop-design-system` | “使用 `desktop-design-system` review Electron 安装矩阵 UI，检查现代桌面生产力风格、主题 tokens 和可读状态标记。” |
| `desktop-packaging-release` | “使用 `desktop-packaging-release` 检查 Electron 在 Windows、macOS 和 Linux 上的打包就绪度，不签名也不发布。” |
| `desktop-qa` | “使用 `desktop-qa` 通过截图和平台说明验证 Electron 应用的浅色、深色和随系统主题。” |
| `dms-repair` | “使用 `dms-repair` 先用只读 SQL 确认数据库现状，准备给人类 DMS 执行的最小 SQL，并规划只读 post-check。” |
| `electron-app-builder` | “使用 `electron-app-builder` 实现 Electron 命令执行器，保持安全 IPC、命令白名单、主题切换和 i18n 状态。” |
| `env-audit` | “使用 `env-audit` 诊断这个 Windows 和 shell 工具链问题，不安装也不修改任何内容。” |
| `github-guard` | “使用 `github-guard` 基于本地 GitHub workflow 证据起草 branch protection 和 required checks，不保存远程设置。” |
| `governance-audit` | “使用 `governance-audit` 只基于当前文件和命令输出审计仓库治理，不把归档计划当作当前证据。” |
| `graph-audit` | “使用 `graph-audit` 检查当前 repo 是否可用 graph-first discovery；如果未索引，说明 fallback。” |
| `guarded-change` | “使用 `guarded-change` 读取本地规则后做最小安全仓库改动，并运行相关 gates。” |
| `i18n-checklist` | “使用 `i18n-checklist` 验证简体中文和英文翻译 key、状态标签和语言切换。” |
| `java-maven-verify` | “使用 `java-maven-verify` 为这个 module 构造最窄 Maven 测试命令，并正确处理 PowerShell quoting。” |
| `knowledge-drift` | “使用 `knowledge-drift` 检查这些 Markdown knowledge 文件是否仍匹配当前 source paths 和 policies。” |
| `merge-fix` | “使用 `merge-fix` 解决当前 merge 冲突，保留双方意图，并运行路径限定验证。” |
| `node-workspace-release` | “使用 `node-workspace-release` 在发布前用 dry-run 检查这个 pnpm workspace release surface。” |
| `pay-docs` | “使用 `pay-docs` 编写中文优先、源码支撑、带风险说明的支付配置文档。” |
| `prompt-qa` | “使用 `prompt-qa` review 并修复这个提示词，直到没有新的提示词问题；不要执行它描述的工作流。” |
| `release-guard` | “使用 `release-guard` 评估公开发布就绪度、package metadata、文档、安全检查和 dry-run 证据，不要发布。” |
| `review-loop` | “使用 `review-loop` review 当前分支变更，修复可执行问题，运行 gates，并复审直到干净。” |
| `runtime-repair` | “使用 `runtime-repair` 诊断这个 agent runtime hook 或 PATH 故障，并在修改前提出最小修复方案。” |
| `security-review` | “使用 `security-review` 扫描公开发布泄漏风险，不打印 secret 值，也不要删除文件。” |

## Workflow 命令示例

| Workflow | PowerShell | Bash |
|---|---|---|
| `archive-check` | `.\workflows\archive-check\archive-check.ps1 -Path .` | `./workflows/archive-check/archive-check.sh --path .` |
| `commit-check` | `.\workflows\commit-check\commit-check.ps1 -Path .` | `./workflows/commit-check/commit-check.sh --path .` |
| `db-read` | `.\workflows\db-read\db-read.ps1 -Path .` | `./workflows/db-read/db-read.sh --path .` |
| `doc-check` | `.\workflows\doc-check\doc-check.ps1 -Path .` | `./workflows/doc-check/doc-check.sh --path .` |
| `drift-check` | `.\workflows\drift-check\drift-check.ps1 -Path .` | `./workflows/drift-check/drift-check.sh --path .` |
| `gate-check` | `.\workflows\gate-check\gate-check.ps1 -Path .` | `./workflows/gate-check/gate-check.sh --path .` |
| `github-check` | `.\workflows\github-check\github-check.ps1 -Path .` | `./workflows/github-check/github-check.sh --path .` |
| `governance-check` | `.\workflows\governance-check\governance-check.ps1 -Path .` | `./workflows/governance-check/governance-check.sh --path .` |
| `graph-check` | `.\workflows\graph-check\graph-check.ps1 -Path .` | `./workflows/graph-check/graph-check.sh --path .` |
| `maven-check` | `.\workflows\maven-check\maven-check.ps1 -Path .` | `./workflows/maven-check/maven-check.sh --path .` |
| `merge-check` | `.\workflows\merge-check\merge-check.ps1 -Path .` | `./workflows/merge-check/merge-check.sh --path .` |
| `node-workspace-check` | `.\workflows\node-workspace-check\node-workspace-check.ps1 -Path .` | `./workflows/node-workspace-check/node-workspace-check.sh --path .` |
| `preflight` | `.\workflows\preflight\preflight.ps1 -Path .` | `./workflows/preflight/preflight.sh --path .` |
| `release-check` | `.\workflows\release-check\release-check.ps1 -Path .` | `./workflows/release-check/release-check.sh --path .` |
| `runtime-check` | `.\workflows\runtime-check\runtime-check.ps1 -Path .` | `./workflows/runtime-check/runtime-check.sh --path .` |
| `security-check` | `.\workflows\security-check\security-check.ps1 -Path .` | `./workflows/security-check/security-check.sh --path .` |
| `startup-check` | `.\workflows\startup-check\startup-check.ps1 -Path .` | `./workflows/startup-check/startup-check.sh --path .` |
