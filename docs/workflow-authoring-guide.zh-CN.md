# Workflow 编写指南

Workflow 是确定性的只读探针，提供两个等价入口。每个 workflow 目录恰好包含五个文件：

- `<name>.sh` — Bash 入口（`--path PATH` 加 workflow 专属参数）
- `<name>.ps1` — PowerShell 入口（`-Path` 加 workflow 专属参数）
- `schema.json` — 输出契约，包含 `"workflow": {"const": "<name>"}`
- `README.md` — 用途、参数、示例调用
- `examples/sample-output.json` — 一份真实且符合 schema 的输出样例

## 输出契约

两个脚本输出单个 JSON 对象，且只包含这些键：`ok`（布尔）、`workflow`（目录名）、`cwd`（字符串）、`os`（`windows`/`macos`/`linux`/`unknown`）、`checks`（`{name, ok, details}` 数组）、`warnings`（字符串数组）、`errors`（字符串数组）。`ok` 为 true 时退出 0，false 时退出 1，参数非法退出 2。`tests/run-workflows.{sh,ps1}` 会在一次性临时仓库中执行每个 workflow，并拒绝任何违反契约的输出。

## 只读规则

- 绝不写入被检查的路径，绝不打开网络或数据库连接，绝不改变 git 状态。
- 可选上下文缺失（没有 `pom.xml`、没有 `executions/`、操作系统不匹配）应产生 warning 或非必需的失败 check，而不是 error。Workflow 必须能在接近空白的仓库上正常运行。
- `errors`（及退出码 1）只用于必需检查失败和非法输入。
- 如果 workflow 会执行调用方提供的命令，破坏性关键词过滤只是尽力而为；usage 文本必须如实说明，而不能声称整个运行完全只读。

## 实现约定

- 脚本刻意保持自包含：安装器按目录逐个复制 workflow，因此不允许共享库文件。从现有 workflow（如 `workflows/commit-check/`）逐字复制辅助函数块（Bash 的 `json_escape`/`add_check`/`add_warning`/`add_error`/`detect_os`；PowerShell 的 `Add-Check`/`Add-Warning`/`Add-Error`/`Get-AgentRoutineOs`）。不要只在单个文件里修改或"优化"辅助函数——任何辅助函数变更必须在同一个 commit 中同步到所有 workflow 脚本。
- 只包含该 workflow 需要的逻辑。不要携带来自其他 workflow 的死分支或未使用参数。
- Bash 的 `json_escape` 必须保留控制字符剥离（`tr -d`），保证任意文件名和命令输出不会破坏 JSON。PowerShell 使用 `ConvertTo-Json`。
- PowerShell 脚本保持纯 ASCII，并兼容 Windows PowerShell 5.1：不使用 `&&`/`||` 管道链、三元运算符、null 合并运算符。
- `.sh` 与 `.ps1` 的检查名、required 标志、warnings 和退出码必须保持一致。

## 新增 Workflow 检查单

1. 创建上述五个文件。
2. 将五个路径加入 `tests/required-paths.txt`（保持排序）。
3. 在 `docs/catalog.md` 和 `docs/catalog.zh-CN.md` 的 workflows 表中各加一行。若某个 skill 应推荐该 workflow，先更新该 skill 的 `Recommended workflows:` 行——`tests/validate-docs` 会强制 catalog 的匹配列等于推荐它的 skill 集合。
4. 在两种 shell 中运行完整门禁（`validate-structure`、`validate-workflows`、`validate-docs`、`run-workflows`）。
