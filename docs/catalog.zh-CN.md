# 例行能力清单

本文列出当前仓库维护的全部源 Skill 和 workflow。Skill 目录仍是判断、编排和边界的事实来源；workflow 目录仍是确定性脚本和 JSON 输出的事实来源。

## Skills

| 名称 | 目标 | 推荐 workflows | 适用场景 |
|---|---|---|---|
| `api-sync` | 处理会影响前端 wrappers、types、enums 或 UI 的后端 API、DTO、enum 变更。 | `preflight`, `gate-check` | 后端契约变更需要判断前端影响并做最小验证。 |
| `archive-record` | 维护持久执行记录、runbooks、证据目录、产物目录和归档布局验证。 | `archive-check` | 任务完成后需要沉淀证据、产物或 runbook。 |
| `commit-guard` | 处理已验证本地提交和可选 push，明确 scope、identity、gates 和人工确认。 | `commit-check`, `gate-check`, `preflight` | 变更需要提交就绪审查、暂存范围控制或授权本地提交。 |
| `dms-repair` | 数据库修复先只读确认，准备最小 SQL，并在人类 DMS 执行后只读复核。 | `db-read` | 数据库修复需要人工执行 SQL 和本地只读证据。 |
| `env-audit` | 跨平台环境、依赖、shell、PATH 和工具链审计。 | `preflight`, `gate-check`, `runtime-check`, `startup-check` | 本地工具链或 shell 行为需要只读诊断。 |
| `github-guard` | 基于仓库证据规划 GitHub Actions、required checks、branch ruleset 和 PR protection。 | `github-check`, `release-check`, `gate-check` | 需要从本地证据生成 GitHub 策略草稿且不保存远程设置。 |
| `governance-audit` | source-first 仓库治理审计，区分当前证据、历史材料、假设和命令输出。 | `governance-check`, `preflight` | 治理声明需要当前 checkout 证据和权威性分类。 |
| `graph-audit` | 检查 codebase graph 和 MCP 就绪度，明确索引范围、项目名、工具可用性和 fallback。 | `graph-check`, `preflight`, `governance-check` | 请求 graph-first discovery 或仓库指令提到 MCP graph 工具。 |
| `guarded-change` | 受控仓库代码改动，覆盖本地规则、风险门禁、最小改动和验证。 | `preflight`, `gate-check` | 仓库变更需要限定 scope 后实现并验证。 |
| `java-maven-verify` | Java Maven 验证，明确 module scope、shell quoting、Maven mirror 和 targeted tests。 | `maven-check`, `gate-check` | Maven 就绪度或 Java 定向测试需要谨慎构造命令。 |
| `knowledge-drift` | 检查 Markdown knowledge、生成 stubs、证据包是否仍匹配当前源码和策略。 | `drift-check`, `doc-check` | 文档或知识产物可能过期。 |
| `merge-fix` | merge 冲突修复，理解双方意图，移除冲突标记，并做路径限定验证。 | `merge-check`, `gate-check` | 存在冲突标记或 merge state 需要安全修复和验证。 |
| `node-workspace-release` | Node、npm、pnpm、workspace、plugin marketplace 和 release dry-run 流程。 | `node-workspace-check`, `gate-check` | Node workspace 或 package 发布前需要只读检查。 |
| `pay-docs` | 支付、订阅和配置文档，中文优先、source-backed、结构化并明确风险。 | `doc-check` | 支付或订阅文档需要源码支撑的场景矩阵和风险说明。 |
| `prompt-qa` | 只 review、修复、复审提示词，不执行提示词描述的工作流。 | 无需 workflow | 提示词需要补齐权限、证据、停止条件和 `BLOCKED` 行为。 |
| `release-guard` | 公开发布就绪检查，覆盖包体、元数据、文档、dry run 和发布门禁。 | `release-check`, `security-check`, `node-workspace-check`, `gate-check` | package 或公开仓库发布前需要就绪度分类。 |
| `review-loop` | review 当前分支变更，修复可执行问题，并重复直到没有新的范围内问题。 | `preflight`, `gate-check` | 用户请求对当前变更执行 review-fix-re-review。 |
| `runtime-repair` | 本地 agent runtime 诊断和修复计划，覆盖 shims、package managers、hooks、版本和编码。 | `runtime-check`, `preflight` | agent runtime 启动、hook、PATH 或版本问题需要诊断。 |
| `security-review` | commit、release 或 distribution 前的本地安全和公开泄漏审查。 | `security-check`, `release-check`, `gate-check` | 敏感值、私有路径或公开包体泄漏需要脱敏审查。 |

## Workflows

| 名称 | 目标 | PowerShell | Bash | 匹配 Skills |
|---|---|---|---|---|
| `archive-check` | 验证执行归档布局、必需文件、证据目录、产物目录和 front matter。 | `.\workflows\archive-check\archive-check.ps1 -Path .` | `./workflows/archive-check/archive-check.sh --path .` | `archive-record` |
| `commit-check` | 检查提交就绪度、分支状态、工作区脏状态、staged/untracked、git identity 和 diff checks。 | `.\workflows\commit-check\commit-check.ps1 -Path .` | `./workflows/commit-check/commit-check.sh --path .` | `commit-guard` |
| `db-read` | 校验只读 SQL wrapper 输入，并拒绝写入、DDL 和执行类关键字，不连接真实数据库。 | `.\workflows\db-read\db-read.ps1 -Path .` | `./workflows/db-read/db-read.sh --path .` | `dms-repair` |
| `doc-check` | 聚合文档检查和可选安全自定义命令，并明确报告缺失 runtime。 | `.\workflows\doc-check\doc-check.ps1 -Path .` | `./workflows/doc-check/doc-check.sh --path .` | `knowledge-drift`, `pay-docs` |
| `drift-check` | 检查 knowledge roots、drift metadata、Markdown frontmatter 覆盖和本地 drift 工具可用性。 | `.\workflows\drift-check\drift-check.ps1 -Path .` | `./workflows/drift-check/drift-check.sh --path .` | `knowledge-drift` |
| `gate-check` | 运行安全通用门禁，如 git diff checks 和明确提供的非破坏性自定义命令。 | `.\workflows\gate-check\gate-check.ps1 -Path .` | `./workflows/gate-check/gate-check.sh --path .` | `api-sync`, `commit-guard`, `env-audit`, `github-guard`, `guarded-change`, `java-maven-verify`, `merge-fix`, `node-workspace-release`, `release-guard`, `review-loop`, `security-review` |
| `github-check` | 检查本地 GitHub Actions workflows 并推导候选 required checks，不修改远程设置。 | `.\workflows\github-check\github-check.ps1 -Path .` | `./workflows/github-check/github-check.sh --path .` | `github-guard` |
| `governance-check` | 检查当前 checkout 的治理文件、agent 目录、验证脚本和 git 状态。 | `.\workflows\governance-check\governance-check.ps1 -Path .` | `./workflows/governance-check/governance-check.sh --path .` | `governance-audit`, `graph-audit` |
| `graph-check` | 检查 graph 和 MCP 就绪信号，不注册 MCP、不索引仓库、不安装 graph 工具、不上传代码。 | `.\workflows\graph-check\graph-check.ps1 -Path .` | `./workflows/graph-check/graph-check.sh --path .` | `graph-audit` |
| `maven-check` | 检查 Java/Maven 就绪度、根 Maven 元数据、wrapper 和用户 Maven mirror 设置。 | `.\workflows\maven-check\maven-check.ps1 -Path .` | `./workflows/maven-check/maven-check.sh --path .` | `java-maven-verify` |
| `merge-check` | 检查 unresolved files、冲突标记、cached diff 健康度和当前 merge state。 | `.\workflows\merge-check\merge-check.ps1 -Path .` | `./workflows/merge-check/merge-check.sh --path .` | `merge-fix` |
| `node-workspace-check` | 检查 Node workspace 元数据、包管理器命令、lockfiles 和常见验证/发布脚本。 | `.\workflows\node-workspace-check\node-workspace-check.ps1 -Path .` | `./workflows/node-workspace-check/node-workspace-check.sh --path .` | `node-workspace-release`, `release-guard` |
| `preflight` | 收集 repo path、branch、HEAD、dirty state、staged/unstaged/untracked 和 rule-file presence。 | `.\workflows\preflight\preflight.ps1 -Path .` | `./workflows/preflight/preflight.sh --path .` | `api-sync`, `commit-guard`, `env-audit`, `governance-audit`, `graph-audit`, `guarded-change`, `review-loop`, `runtime-repair` |
| `release-check` | 检查公开发布就绪信号，不 publish、tag、push、改版本或创建 artifact。 | `.\workflows\release-check\release-check.ps1 -Path .` | `./workflows/release-check/release-check.sh --path .` | `github-guard`, `release-guard`, `security-review` |
| `runtime-check` | 检查本地 agent runtime 前置条件，如 shell、PATH、包管理器命令、settings 和 hook wrappers。 | `.\workflows\runtime-check\runtime-check.ps1 -Path .` | `./workflows/runtime-check/runtime-check.sh --path .` | `env-audit`, `runtime-repair` |
| `security-check` | 扫描 secret-like patterns 和 private path signals，不打印敏感值。 | `.\workflows\security-check\security-check.ps1 -Path .` | `./workflows/security-check/security-check.sh --path .` | `release-guard`, `security-review` |
| `startup-check` | 检查 Windows startup sources，如 Run keys、StartupApproved keys 和类似启动项的计划任务。 | `.\workflows\startup-check\startup-check.ps1 -Path .` | `./workflows/startup-check/startup-check.sh --path .` | `env-audit` |
