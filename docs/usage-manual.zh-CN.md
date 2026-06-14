# 使用手册

1. Clone 或复制源仓库。
2. 运行结构、Skills 和 workflows 校验器。
3. 审阅你计划安装的 Skills 和脚本。
4. 对个人复用使用用户级安装；对需要仓库固定行为的场景使用项目级安装。
5. 需要确定性检查时，优先在提示词中引用 workflow 运行时路径。

判断密集型工作使用 Skills。需要稳定 JSON 和可重复检查时使用 workflows。

代码发现时，如果本仓库已经被 codebase-memory-mcp 索引，应优先使用 graph 工具。如果 graph 不可用或结果不足，则回退到 `rg` 或直接阅读文件，并在结果中说明回退原因。不要把 graph 输出视为生成型事实来源；维护事实来源仍然是本仓库中的文件。

完整清单见 [例行能力清单](catalog.zh-CN.md)。提示词和命令示例见 [例行能力使用示例](examples.zh-CN.md)。

跨项目复用时，可以在用户级安装 manifest 中的通用 Skills：guarded-change、review-loop、merge-fix、env-audit、runtime-repair、commit-guard、prompt-qa、release-guard、security-review、github-guard 和 graph-audit。项目特定行为应在审阅目标仓库规则后再安装到项目级。

大范围安装或重新安装前，应先运行安装器 dry-run 并审阅目标清单。PowerShell 安装器使用 `-WhatIf`；Bash 安装器使用 `--dry-run`。多项目分发优先使用 install discovery config v2，并在 Apply 前审阅生成的 `actions[]`。Dry-run 模式不得创建目标目录、复制文件、删除文件或替换已安装内容。

改动前可以用领域 workflows 做只读探测：

- `runtime-check` 用于本地 agent runtime 诊断。
- `maven-check` 用于 Java/Maven 验证就绪度。
- `governance-check` 用于 source-first 治理审计。
- `node-workspace-check` 用于 npm 或 pnpm workspace 发布就绪度。
- `drift-check` 用于源绑定知识新鲜度。
- `startup-check` 用于 Windows 启动项来源枚举。
