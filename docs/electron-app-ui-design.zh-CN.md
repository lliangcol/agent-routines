# Electron 应用 UI 设计图

本文档是 Agent Routines Manager 的前端设计契约。它补充 [Electron 应用执行规范](electron-app-plan.zh-CN.md)，为后续实现 agent 提供界面布局、组件行为、视觉 tokens 和交互规则。

设计目标是克制、实用的桌面运维控制台。它应像一个专业的仓库管理工具，而不是营销落地页、AI 助手产品或装饰性 dashboard。

已生成的实现参考图：

![Agent Routines Manager Install Matrix mockup](assets/electron-app-main-install-matrix.svg)

视觉预览 PNG：

![Agent Routines Manager Install Matrix visual preview](assets/electron-app-main-install-matrix-preview.png)

精确标签、状态值和布局以 SVG 为实现参考；PNG 仅作为视觉风格预览。

已优化参考图覆盖范围：

- 原生桌面窗口框架、固定左侧导航、视图命令栏、主矩阵工作区、右侧详情抽屉和始终可见的状态栏。
- 以 Install Matrix 作为第一视觉优先级，用七个代表性 routine 覆盖五类安装目标。
- 每个矩阵状态都使用图标加文本：`same`、`drift`、`missing` 和 `shared`。
- 选中单元格抽屉包含写入安全上下文、逐目标状态、源路径、变更文件、推荐 workflow 和受门禁保护的操作。
- PNG 预览由 SVG 参考图渲染生成；SVG 变化时应同步重新生成 PNG。

## 产品工作流图

主操作路径必须以源仓库为准，并对所有写入做门禁：

```mermaid
flowchart LR
  A["选择源仓库"] --> B["扫描清单和安装目标"]
  B --> C["审阅 Install Matrix"]
  C --> D["编辑项目和策略"]
  D --> E["校验 config"]
  E --> F["生成 dry-run plan"]
  F --> G["审阅 manifest diff"]
  G --> H{"是否 Apply?"}
  H -->|否| I["保存计划证据"]
  H -->|是| J["确认写入操作"]
  J --> K["运行单任务队列"]
  K --> L["检查安装目标"]
  L --> M["提供执行归档"]
```

辅助路径不得绕过主路径：

- `Validation` 可以运行仓库门禁，但写入动作只能发生在 `Distribute`。
- 任务日志可以全局查看，但命令来源必须是白名单 UI 动作。
- Settings 可以修改主题、语言和记住的路径，但不能静默修改 source policy。

## 设计原则

- 使用密集表格、分栏、抽屉和命令栏。不要使用 hero 区、发光效果、大型营销卡片或装饰性 AI 插画。
- `Install Matrix` 是主界面。Dashboard 只是状态摘要，不是产品中心。
- 每个写入动作都必须展示校验状态、计划证据和确认步骤。
- 状态标记使用图标加文本。不能只靠颜色表达。
- 优先使用原生桌面习惯：系统字体、原生菜单、原生对话框、平台快捷键、可预期窗口行为。
- 文本保持紧凑、可扫描。长路径和命令输出必须有明确换行、截断和复制动作。
- 所有标签都必须由翻译 key 支撑。不要翻译路径、命令名、JSON 字段或 routine 标识符。

## 应用外壳

主桌面尺寸：`1360 x 900`。最低可工作尺寸：`1024 x 720`。应用可以在更窄宽度下保持部分可用，但实现应优先服务桌面生产力工作流。

```text
+--------------------------------------------------------------------------------+
| 顶部命令栏：仓库选择 | config 选择 | 搜索 | 主题 | 语言                       |
+----------------------+---------------------------------------------------------+
| 左侧导航             | 内容标题：标题、面包屑、状态、操作                     |
| 248 px               +---------------------------------------------------------+
|                      | 主工作区                                                |
| Dashboard            |                                                         |
| Inventory            | 表格、矩阵、表单、分栏、抽屉                            |
| Install Matrix       |                                                         |
| Projects             |                                                         |
| Policy               |                                                         |
| Distribute           |                                                         |
| Validation           |                                                         |
| Task Center          |                                                         |
| Docs                 |                                                         |
| Settings             |                                                         |
+----------------------+---------------------------------------------------------+
| 底部状态栏：仓库健康度 | 活跃任务 | shell readiness | branch                  |
+--------------------------------------------------------------------------------+
```

外壳行为：

| 区域 | 行为 |
| --- | --- |
| 顶部命令栏 | 仓库和 config 选择器通过 main-process IPC 打开原生对话框。搜索优先过滤当前视图，并通过 `Ctrl+K` 或 `Cmd+K` 打开全局搜索。 |
| 左侧导航 | 桌面端固定宽度。低于 `1120px` 折叠为仅图标。每项使用 lucide 图标和文本。 |
| 内容标题 | 展示视图标题、简短证据状态和当前范围操作。写入动作不得只出现在顶部栏。 |
| 主工作区 | 使用全宽 pane，不使用嵌套卡片。重复项可以使用紧凑行或 8px 以内圆角 panel。 |
| 底部状态栏 | 始终可见。展示仓库可读状态、config 校验状态、活跃任务状态和 shell readiness。 |
| 右侧抽屉 | 用于详情、diff、日志和确认上下文。宽度 `360-480px`，可在边界内调整。 |

推荐导航图标：

| 视图 | 图标 | 用途 |
| --- | --- | --- |
| Dashboard | `LayoutDashboard` | 摘要状态 |
| Inventory | `Boxes` | 源 Skills 和 workflows |
| Install Matrix | `TableProperties` | 源到目标对比 |
| Projects | `FolderTree` | 已审阅项目根目录 |
| Policy | `SlidersHorizontal` | 分发范围策略 |
| Distribute | `Send` | 安全写入向导 |
| Validation | `ListChecks` | 仓库门禁 |
| Task Center | `SquareTerminal` | 队列、日志、归档证据 |
| Docs | `FileText` | 本地文档索引 |
| Settings | `Settings` | 主题、语言、本地偏好 |

## 视觉系统

使用中性、低饱和度的生产力配色，并保留清晰状态强调色。

| Token | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `surface.canvas` | `#f6f7f9` | `#17191c` | 应用背景 |
| `surface.panel` | `#ffffff` | `#202327` | 表格、抽屉、工具栏 |
| `surface.subtle` | `#eef1f4` | `#292d33` | 行 hover、二级 pane |
| `text.primary` | `#1d2430` | `#eef2f6` | 主文本 |
| `text.secondary` | `#5a6675` | `#aab4c0` | 元数据 |
| `border.default` | `#d7dde5` | `#3a414b` | 分隔线 |
| `accent.primary` | `#2764c5` | `#6ea0ff` | 主操作、焦点 |
| `status.ok` | `#1f7a4d` | `#5fc489` | `same`、成功 |
| `status.warning` | `#9a6200` | `#e0b45a` | `drift`、警告 |
| `status.error` | `#b42318` | `#ff867c` | `broken`、失败 |
| `status.neutral` | `#6b7280` | `#a1a8b3` | `missing`、`unknown`、idle |

字体：

| 用途 | Size | Weight | 说明 |
| --- | --- | --- | --- |
| 视图标题 | 20 | 600 | 不使用 hero 尺寸 |
| 分区标题 | 15 | 600 | 用于 pane 和抽屉 |
| 表格正文 | 13 | 400 | 默认密集数据文本 |
| 元数据 | 12 | 400 | 路径、时间戳、计数 |
| 代码/输出 | 12 | 400 | 等宽字体，带复制动作 |

间距与形状：

- 基础间距单位：`4px`。
- 工具栏高度：`40px`。
- 密集行高度：`36px`。
- 矩阵单元最小尺寸：`112 x 40px`。
- 按钮：普通 `32px` 高，表格紧凑操作 `28px` 高。
- 圆角：输入/按钮 `4px`，panel `6px`，最大 `8px`。
- 焦点环：2px 可见轮廓，使用 `accent.primary`。

## 界面设计图

### Dashboard

用途：提供方向感和 readiness 摘要。它不能替代 Install Matrix 主工作流。

```text
+------------------------------------------------------------------------------+
| Dashboard                                    [Refresh] [Run diagnostics]      |
| Repository D:\Repositories\agent-routines   Config .agent-routines\...       |
+------------------------------------------------------------------------------+
| Source inventory      Install state          Validation          Last task    |
| 24 skills             18 same                 Docs ok             none running |
| 17 workflows          2 drift                 Manifest ok         0 failed     |
+------------------------------------------------------------------------------+
| Readiness checklist                         | Recent activity                 |
| [ok] Repository readable                    | 14:32 validate-docs ok          |
| [warn] Bash not found in PowerShell host    | 14:30 generate dry-run plan     |
| [ok] Config validated                       | 14:20 scan inventory            |
+---------------------------------------------+--------------------------------+
| Next safe actions                                                             |
| [Open Install Matrix] [Validate config] [Generate dry-run plan]               |
+------------------------------------------------------------------------------+
```

交互：

- `Refresh` 重新运行只读 inventory、install matrix scan 和当前 config 状态。
- `Run diagnostics` 以只读任务启动 `diagnostics.run`。
- 摘要 tile 点击后进入对应视图。
- 警告打开详情抽屉，展示精确宿主机证据和最小下一步。

### Inventory

用途：展示 `skills/*` 和 `workflows/*` 的源仓库清单。

```text
+------------------------------------------------------------------------------+
| Inventory                                  [Refresh] [Export list]            |
| Filter [All kinds v] [All status v] Search [.............................]    |
+------------------------------------------------------------------------------+
| Name                         Kind       Required files   Recommended workflows |
| electron-app-builder         Skill      complete         node-workspace-check  |
| desktop-design-system        Skill      complete         doc-check, gate-check |
| node-workspace-check         Workflow   complete         -                     |
| runtime-check                Workflow   complete         -                     |
+------------------------------------------------------------------------------+
| Details drawer: selected routine                                             |
| Path, README/SKILL/schema presence, catalog entry, matching install targets   |
+------------------------------------------------------------------------------+
```

交互：

- 点击行打开详情抽屉。
- `Export list` 通过已批准对话框复制或保存只读 inventory JSON。
- 缺失源文件显示 `broken` 源状态，并链接到校验证据。
- Routine 名称不翻译。

### Install Matrix

用途：源到安装目标 drift 和安装就绪度的主工作界面。

```text
+--------------------------------------------------------------------------------+
| Install Matrix                                  [Refresh scan] [Open wizard]   |
| View [All routines v] Tool [All v] Scope [All v] Status [All v] Search [...]  |
+----------------------------+-----------+-----------+-----------+---------------+
| Routine                    | Codex user| Codex proj| Claude user| Workflow rt  |
+----------------------------+-----------+-----------+-----------+---------------+
| electron-app-builder       | same      | missing   | same       | shared        |
| desktop-design-system      | drift     | missing   | same       | shared        |
| node-workspace-check       | shared    | shared    | shared     | same          |
| runtime-check              | shared    | shared    | shared     | same          |
+----------------------------+-----------+-----------+-----------+---------------+
| Legend: [same] [drift] [broken] [missing] [unknown] [shared]                  |
+--------------------------------------------------------------------------------+
```

单元格详情抽屉：

```text
+----------------------------------------------+
| desktop-design-system - Codex user            |
| Status: drift                                 |
| Source: D:\Repositories\...\skills\...        |
| Target: C:\Users\...\ .codex\skills\...       |
| Changed files                                 |
| - SKILL.md                                    |
| - README.md                                   |
| Suggested action                              |
| [Generate dry-run plan] [Open source]         |
+----------------------------------------------+
```

交互：

- 点击矩阵单元格打开详情抽屉。
- 双击 `drift` 或 `broken` 时，如有数据则打开文件级对比。
- `Open wizard` 将当前筛选条件带入 Distribute Wizard。
- `Refresh scan` 是只读操作，可在无写任务运行时执行。
- 状态 pill 包含图标和翻译文本。内部状态 key 保持稳定。
- `unknown` 目标可见，但绝不自动删除。

### Projects

用途：维护已审阅根目录，用于项目级发现，避免全盘扫描。

```text
+------------------------------------------------------------------------------+
| Projects                                      [Add root] [Validate config]    |
+------------------------------------------------------------------------------+
| Root path                         Depth   Nested repos   Excluded directories |
| D:\Repositories                   2       skip           node_modules,.git    |
| D:\Work\Projects                  2       skip           node_modules,.git    |
+------------------------------------------------------------------------------+
| Project preview                                                               |
| discovered path              tool targets        warnings                     |
| D:\Repositories\agent-routines Codex, Claude     current source repo          |
+------------------------------------------------------------------------------+
```

交互：

- `Add root` 使用 `dialogs.pickDirectory`。
- 行内编辑立即校验路径形态，但在保存前不写 config。
- `Validate config` 运行 install-discovery config validator。
- 嵌套仓库行为使用 segmented control：`skip`、`include`、`warn`。
- 排除目录使用 tokenized inputs，并检查重复项。

### Policy

用途：编辑分发策略，并在计划生成前完成校验。

```text
+------------------------------------------------------------------------------+
| Policy                                      [Validate] [Save config as...]    |
+------------------------------------------------------------------------------+
| [User-level Skills] [Project-only Skills] [User Workflows] [Project Workflows]|
+------------------------------------------------------------------------------+
| Available routines             | Selected policy                              |
| [ ] electron-app-builder       | [x] guarded-change                           |
| [ ] desktop-design-system      | [x] review-loop                              |
| [ ] desktop-qa                 | [x] electron-app-builder                     |
| Search routines [...]          | [Remove] [Move up] [Move down]               |
+------------------------------------------------------------------------------+
| Validation messages: duplicate names, invalid names, missing source folders   |
+------------------------------------------------------------------------------+
```

交互：

- 多选列表使用 checkbox 行。
- 拖拽排序可选，但必须提供键盘可用的 `Move up` 和 `Move down`。
- 无效策略阻止计划生成，并说明准确字段路径。
- `Save config as` 使用原生保存对话框，只写选中的 config 文件。

### Distribute Wizard

用途：manifest 和 install distribution 的唯一安全写入路径。

```text
+--------------------------------------------------------------------------------+
| Distribute                                                                      |
| Stepper: 1 Inventory > 2 Targets > 3 Policy > 4 Plan > 5 Apply                 |
+--------------------------------------------------------------------------------+
| Step content                                              | Gate checklist      |
|                                                           | [ok] config valid   |
| 1 Inventory: source counts and source validation          | [ok] plan generated |
| 2 Targets: user/project targets by tool                   | [ ] manifest review |
| 3 Policy: selected scopes                                 | [ ] confirmation    |
| 4 Plan: dry-run JSON, commandsToRun, manifest diff        |                     |
| 5 Apply: final confirmation, no force by default          |                     |
+--------------------------------------------------------------------------------+
| [Back] [Generate dry-run plan] [Write manifest] [Apply] [Force Apply]          |
+--------------------------------------------------------------------------------+
```

计划审阅布局：

```text
+------------------------------------------------------------------------------+
| Plan JSON                         | Manifest diff                             |
| commandsToRun                     | + skills/electron-app-builder             |
| install targets                   | + workflows/node-workspace-check          |
| warnings                          | ! existing target requires force          |
+------------------------------------------------------------------------------+
```

确认弹窗：

```text
+---------------------------------------------------------------+
| Confirm distribution apply                                    |
| This will run allowlisted install commands against reviewed   |
| targets from the generated manifest.                          |
|                                                               |
| Required checks                                               |
| [ok] Config validation passed                                 |
| [ok] Dry-run plan generated at 2026-06-13 14:32               |
| [ok] Manifest diff reviewed                                   |
| [ ] I understand this writes to selected install targets      |
|                                                               |
| [Cancel] [Apply distribution]                                 |
+---------------------------------------------------------------+
```

交互：

- config 校验、dry-run plan 生成和 manifest review 完成前，`Apply` 保持禁用。
- `Force Apply` 默认隐藏；操作者显式展开 advanced actions 后仍需二次确认。
- Wizard 可向后移动且不丢失状态。
- 任何 config 编辑都会使下游 plan 和 apply readiness 失效。
- apply 失败时打开 Task Center，并展示失败命令、stdout、stderr 和 exit code。
- apply 成功后提供 `Run install check` 和 `Write archive`。

### Validation

用途：用清晰命令证据暴露仓库门禁。

```text
+------------------------------------------------------------------------------+
| Validation                                  [Run selected] [Run all readonly] |
| Shell [PowerShell v]  Filter [All v]                                             |
+------------------------------------------------------------------------------+
| Gate                                      Shell       Status   Duration        |
| validate-structure                       ps1         ok       0.6s            |
| validate-skills                          ps1         ok       0.5s            |
| validate-docs                            ps1         ok       0.5s            |
| run-workflows                            ps1         warning  7.0s            |
+------------------------------------------------------------------------------+
| Output pane                                                                   |
| command, cwd, stdout, stderr, exit code, startedAt, endedAt                   |
+------------------------------------------------------------------------------+
```

交互：

- `Run selected` 通过任务队列启动只读任务。
- `Run all readonly` 遵循 `AGENTS.md` 的门禁集合。
- Warning 与 failure 明确区分。
- Output pane 提供 command 和完整输出复制动作。
- 另一种 shell 不可用时展示平台缺口 warning，不显示泛化失败。

### Task Center

用途：全局队列、日志、取消和归档证据。

```text
+--------------------------------------------------------------------------------+
| Task Center                                  [Clear completed] [Open archive]   |
+-------------------------------+------------------------------------------------+
| Queue                         | Log inspector                                  |
| running generateInstallPlan   | command: tools\generate-install-manifest.ps1   |
| pending validateInstallConfig | cwd: D:\Repositories\agent-routines            |
| succeeded inventory.scan      | stdout                                         |
| failed runRepositoryGate      | stderr                                         |
+-------------------------------+------------------------------------------------+
| Task evidence: command metadata, duration, exit code, artifacts, archive offer |
+--------------------------------------------------------------------------------+
```

交互：

- 同一时间只能有一个写入或安装任务运行。
- 如果只读任务依赖写入结果，则排在写任务之后。
- 只有能安全终止子进程时才提供 `Cancel`。
- 已完成任务行保留到清理或应用重启，具体由本地设置决定。
- 成功 apply 后，或请求 dry-run 证据捕获后，显示 archive offer。

### Docs

用途：提供本地文档入口，但不暴露任意文件系统访问。

```text
+------------------------------------------------------------------------------+
| Docs                                         Search [.....................]    |
+------------------------------------------------------------------------------+
| Electron App Execution Plan      Security      Distribution      Release       |
| Electron App UI Design           Prerequisites Install Discovery Examples      |
+------------------------------------------------------------------------------+
| Preview pane: selected markdown summary and open-in-editor action             |
+------------------------------------------------------------------------------+
```

交互：

- Docs 列表限制为应用已知的仓库文档。
- 打开文件使用白名单 docs operation。
- 搜索匹配标题、文件名和 headings。

### Settings

用途：本地偏好和应用 readiness。

```text
+------------------------------------------------------------------------------+
| Settings                                                                      |
+------------------------------------------------------------------------------+
| Appearance                                                                    |
| Theme         [Light] [Dark] [System]                                         |
| Language      [English] [Simplified Chinese]                                  |
+------------------------------------------------------------------------------+
| Paths                                                                         |
| Source repository  D:\Repositories\agent-routines       [Choose...]          |
| Active config      .agent-routines\install-discovery... [Choose...]          |
+------------------------------------------------------------------------------+
| Runtime readiness                                                             |
| Git ok | PowerShell ok | Bash warning | Python ok | Node ok                  |
+------------------------------------------------------------------------------+
```

交互：

- 主题修改立即生效并本地持久化。
- 语言修改无需重启。
- `Choose` 按钮使用原生对话框。
- Runtime readiness 是只读信息，并链接到 Diagnostics。
- Reset settings 需要确认，但不触碰仓库文件。

## 组件清单

| Component | 职责 | 说明 |
| --- | --- | --- |
| `AppShell` | 顶部栏、导航、底部状态栏、内容区域 | 只负责布局 |
| `RepositorySelector` | 当前仓库路径和选择器 | 调用 `dialogs.pickDirectory` |
| `ConfigSelector` | 当前 config 路径和选择器 | 调用 `dialogs.pickFile` |
| `CommandBar` | 视图级操作 | 写入动作需要明确视图上下文 |
| `StatusPill` | 图标加翻译 label | 使用稳定内部状态 key |
| `DataToolbar` | 筛选、搜索、刷新 | 表格和矩阵视图 |
| `RoutineTable` | Inventory 行 | 密集行高 |
| `InstallMatrixGrid` | 源到目标状态矩阵 | 主工作组件 |
| `DetailDrawer` | 单元格、routine、warning 和 task 详情 | 可调整宽度 |
| `WizardStepper` | Distribute 流程状态 | 下游失效状态可见 |
| `CommandOutputPane` | 命令证据 | 等宽字体，复制动作 |
| `TaskQueuePanel` | 队列和日志状态 | 支持安全取消 |
| `ConfirmWriteDialog` | Apply 和 force 确认 | 复选确认 |
| `SettingsForm` | 主题、语言、路径 | 仅写本地 store |

## 交互规则

### 全局搜索

- `Ctrl+K` 或 `Cmd+K` 打开 command/search palette。
- 搜索可以跳转到 routines、docs、tasks、validation gates 和 settings。
- 搜索不能直接执行写命令，只能跳转到对应受门禁保护的视图。

### 未保存变更

- Projects 和 Policy 编辑后展示 dirty state。
- 离开页面时询问 discard、save 或 stay。
- 带 dirty config 生成计划时，提示操作者保存，或明确继续使用上一次保存的 config。

### 禁用状态

- 禁用按钮必须显示 tooltip 或 inline reason。
- `Apply` 禁用原因包括 config invalid、plan missing、manifest not reviewed、write task running 或 confirmation missing。
- `Force Apply` 禁用原因包括 advanced action hidden、force confirmation missing 或 policy forbids replacement。

### 错误处理

- 字段校验错误保留在字段旁边。
- 命令失败时打开 Task Center，并保留 stdout、stderr 和 exit code。
- 不阻塞当前操作的平台缺口显示为 warning。
- 任何意外 IPC validation failure 都作为 app bug 处理，并展示安全、非敏感消息。

### 确认规则

| Action | Confirmation |
| --- | --- |
| Generate dry-run plan | 不需要确认 |
| Write manifest | 需要确认 |
| Apply distribution | 需要确认 |
| Force apply distribution | Advanced reveal 加 typed 或 checkbox confirmation |
| Write archive | 需要确认，除非操作者在成功提示中启用 archive |
| Reset local settings | 需要确认 |

### 键盘与可访问性

- 所有主操作都可用键盘触达。
- 表格和矩阵单元支持方向键导航。
- `Enter` 打开选中的行或单元格详情。
- `Escape` 按顺序关闭 drawer、dialog 和 global search。
- 每个纯图标按钮必须有 accessible label 和 tooltip。
- 状态以文本读出，不能只靠颜色。

## 响应式行为

| 宽度 | 行为 |
| --- | --- |
| `>= 1280px` | 完整导航、内容区、可选抽屉。 |
| `1120-1279px` | 完整导航，抽屉使用 overlay 而非固定占宽。 |
| `1024-1119px` | 图标导航、紧凑命令栏、抽屉 overlay。 |
| `< 1024px` | 展示不支持尺寸提示，但保留 settings 和 docs 可访问。 |

文本处理：

- 路径使用中间截断，并提供复制动作。
- 命令输出默认换行，可切换为横向滚动。
- 中英文标签必须适配按钮；必要时使用带 tooltip 的仅图标紧凑变体。

## 实现验收清单

- 第一个实现界面是 app shell 加 Install Matrix，不是 landing page。
- 所有导航项都存在，即使部分 route 初期只显示 implementation placeholder。
- Install Matrix、Distribute Wizard、Validation、Task Center、Settings、Dashboard 和 Docs 在视觉 QA 前匹配本文档。
- 浅色、深色和随系统主题使用本文列出的 token 类别。
- 英文和简体中文 label 使用翻译 key，并可不重启切换。
- Renderer 不暴露任意命令执行或文件系统访问。
- 写入动作只能通过受门禁保护的 Distribute 或 archive 流程触达。
- 验收截图包括 Dashboard、Install Matrix、Distribute Wizard、Validation、Task Center、Settings、浅色主题和深色主题。
