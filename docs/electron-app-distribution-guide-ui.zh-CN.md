# Electron 应用分发向导 UI

本文固定 Agent Routines Manager 分发 v2 的 UI、交互和图标契约。后续实现必须先对齐本规格，再扩展行为。

## 目标

- 明确表达只配置用户级、只配置项目级、指定项目、用户级加项目级。
- 在任何写入动作前展示 desired state。
- 破坏性动作不得进入保存的配置；只能来自本次 UI 或 CLI 请求。
- 同时展示聚合安装状态和具体项目明细。
- 提供经过审阅并参与桌面打包的专属应用图标。

## 分发向导流程

Distribute 页面固定为六步：

1. 选择范围
   - 选项：User only、All discovered projects、Selected projects、User + selected projects。
   - 项目行展示启用状态，并提供“只保留这个项目”操作。
   - 本步骤汇总当前 desired scope，而不是只显示已发现证据。

2. 选择内容
   - Skills 和 Workflows 作为 desired content 审阅。
   - Skills 可安装到 Codex、Claude Code 或两者。
   - Workflows 安装到共享 Agent Routines runtime。
   - “禁止提升到用户级的 Skills”是 promotion rule，不是项目安装目标。

3. 审阅目标
   - 展示解析后的用户级目标、项目级目标和 report-only unmanaged items。
   - 每个目标动作只能是 install、skip、replace 或 prune-candidate。
   - unknown / unclassified installed items 永远 report-only。

4. 应用模式
   - dry-run only：只生成和审阅计划，不写入。
   - merge：安装缺失项，已有目标跳过。
   - replace-listed：只替换 manifest 列出的 desired targets。
   - sync-prune：只删除 desired state 外的受管已知 routine 目标。
   - 确认短语：
     - `APPLY`
     - `REPLACE <N> TARGETS`
     - `SYNC PRUNE <N> TARGETS`

5. 执行与验证
   - Validate config。
   - Generate manifest。
   - 审阅只读 Plan JSON 和 manifest diff。
   - 写入已审阅 manifest。
   - 只有当前模式的确认短语完全匹配后才允许 Apply。

6. 结果
   - 展示 installed、skipped、replaced、pruned、failed、unknown、unclassified。
   - 可跳回 Project Detail Matrix 诊断具体目标。
   - 保留已审阅任务证据，供 archive flow 写入归档。

## Policy 页面

Policy 拆成四组：

- User defaults：用户级 tools、Skills、workflows。
- Project defaults：发现项目的 tools、Skills、workflows、createTargets、sync mode。
- Project overrides：显式项目级 desired state。
- Promotion rules：禁止安装到用户级的 Skills。

Promotion rules 不得再使用 Project-only 文案，否则会误导用户以为这是项目安装目标。

## Projects 页面

Projects 是发现和覆盖配置入口：

- Roots 仍是发现输入。
- discovered projects 和 project overrides 显示目标根目录和工具目录。
- 每个项目可声明 tools、Skills、workflows、createTargets、mode。
- “只保留这个项目”会禁用 user defaults 和 project defaults，并启用选中项目覆盖。

## Install Matrix

Matrix 分两层：

- Summary Matrix 只聚合 desired targets。
- 未选中的矩阵单元显示 `not-targeted`；不得复用 `shared`。
- Project Detail Matrix 展开 routine x project x tool。

聚合严重度顺序：

`broken > unknown > drift > missing > same > shared > not-targeted`

详情必须展示 project path、target path、action、missing files、changed files。

## Plan JSON 安全

Plan JSON 只读。Apply 前的主要审阅来源是 action table 和生成的 manifest。如果用户在 UI 中编辑文本，Apply 不能静默忽略该编辑。

## 应用图标

应用图标表达 Agent Routines Manager：本地分发、受控执行、Skills/workflows 矩阵。

要求：

- master artwork：1024 x 1024 PNG。
- 不包含文字、字母、水印、吉祥物或复杂小细节。
- 在 16、24、32、48、64、128、256 px 下仍可识别。
- Windows ICO 必须包含 16、24、32、48、64、128、256 px。
- 交付文件：
  - `apps/agent-routines-manager/resources/icon.png`
  - `apps/agent-routines-manager/resources/icon.ico`
  - `apps/agent-routines-manager/resources/icon-source.prompt.md`

打包验收必须确认 `electron-builder.yml` 继续指向 `resources/icon.ico`，并且窗口、任务栏、安装目录图标都使用已审阅图标。

## 验收

- config v2 是默认新模型。
- v1 文件可读取并迁移。
- Bash 和 PowerShell 生成器输出同形 manifest。
- dirty config、validation failed、digest mismatch、backup 缺失、确认短语错误时禁用破坏性 Apply。
- unknown 和 unclassified installed items 永远 report-only。
- 最终桌面包包含已审阅应用图标。
