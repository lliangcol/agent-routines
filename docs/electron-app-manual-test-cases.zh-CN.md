# Electron 应用人工测试用例

本文档用于人工测试本地 `Agent Routines Manager` Electron 应用，覆盖本地打包应用、开发模式应用、功能流程、界面行为、交互状态、本地化、桌面集成和安全边界。

## 测试对象

| 项目 | 值 |
| --- | --- |
| 应用 | `apps/agent-routines-manager` |
| 本地打包可执行文件 | `apps/agent-routines-manager/out/win-unpacked/Agent Routines Manager.exe` |
| 开发模式命令 | 在 `apps/agent-routines-manager` 下运行 `npm run dev` |
| 本地打包命令 | 在 `apps/agent-routines-manager` 下运行 `npm run package` |
| 源仓库 | `D:\Repositories\agent-routines` |
| 默认 config | `tools/install-discovery.config.example.json` |

人工测试安全规则：

- 不运行发布、签名、上传、git commit、push 或 tag 命令。
- 破坏性 apply modes 在确认短语和备份要求满足前都是被阻止的安全路径。
- 如需测试 `另存配置...`，只写入被忽略的临时路径，例如 `.tmp/manual-test-install-discovery.config.json`，测试后删除。
- `~/.codex`、`~/.claude` 和 `~/.agent-routines` 下的用户级安装目标是运行时目标，不是维护源。

## 自动化执行模型

人工测试、Codex 内置浏览器测试和电脑控制测试使用同一组用例 ID。只有负责该用例的执行面留下证据后，才算通过。

| 执行面 | 适用范围 | 入口 | 证据 |
| --- | --- | --- | --- |
| Shell | 依赖、构建、单元测试、Playwright、本地打包和仓库门禁。 | 回归门禁清单中的命令。 | 命令、cwd、退出码、stdout/stderr 和生成报告路径。 |
| Codex 内置浏览器 | 不依赖原生 Electron API、OS 对话框、菜单或真实 IPC 的 renderer preview 流程。 | `npm run test:ui`，或在 `npm run dev:renderer -- --port 5173` 后打开 `http://127.0.0.1:5173`。 | Playwright 报告、失败 trace 或截图，以及用于视觉检查的 Browser 截图。 |
| 电脑控制 | 打包或开发模式 Electron 原生窗口、原生菜单、原生对话框、DevTools、OS 浏览器跳转、重启和窗口尺寸。 | `npm run package` 后启动 `out/win-unpacked/Agent Routines Manager.exe`，或运行 `npm run dev`。 | 原生窗口截图、动作日志、命令输出和清理说明。 |

自动化规则：

- 优先使用 accessible role、label、placeholder 和可见 heading，不依赖脆弱坐标或纯 CSS selector。
- Browser-preview 自动化必须断言 `浏览器预览` chip，且不能声称覆盖原生 IPC、原生菜单、原生对话框、打包应用导航保护或 OS 浏览器跳转。
- 电脑控制自动化可以点击原生 UI 和对话框，但不得批准发布、签名、上传、git commit、push、tag、`Apply`、`replace-listed` 或 `sync-prune`。
- 全自动化表示每个用例都由 shell、Codex 内置浏览器或电脑控制执行，或者针对当前主机明确标注不适用并给出具体原因。

全自动化运行契约：

- 按三个批次顺序执行：shell 准备和打包、Codex 内置浏览器 renderer-preview 自动化、电脑控制原生 Electron 自动化。
- 每个用例结果必须是 `passed`、`failed`、`skipped-not-applicable` 或 `blocked` 之一。
- 每条结果记录必须包含用例 ID、执行面、时间戳、命令或原生窗口、断言摘要、产物路径和清理状态。
- Browser-preview 通过证据必须包含 `浏览器预览` 标记，且不能作为原生菜单、IPC、OS 对话框或打包应用行为的证明。
- 电脑控制通过证据必须来自标题为 `Agent Routines Manager` 的打包或开发模式 Electron 窗口；除非用例明确要求测试禁用或拒绝状态，否则不得点击通过破坏性确认。
- 每次完整运行结束时都要关闭测试启动的应用进程、停止 renderer dev server、删除 `.tmp/manual-test-install-discovery.config.json`，并记录安装目标是否发生变化。

自动化选择器契约：

| 目标 | 优先选择器或锚点 | 说明 |
| --- | --- | --- |
| 主导航 | Navigation landmark 加精确可见路由标签。 | Browser preview 和电脑控制都适用；路由标签可以是英文或简体中文。 |
| 全局搜索 | Placeholder `Search routines, docs, tasks...` 或 `搜索 routines、文档、任务...`。 | 切换可搜索路由时保留输入值。 |
| 矩阵搜索 | Placeholder `Search routines or targets...` 或 `搜索 routines 或目标...`。 | 与类型、工具和状态筛选组合使用。 |
| 文档搜索 | Placeholder `Search docs...` 或 `搜索文档...`。 | 不能变成通用文件系统搜索。 |
| 分发 Plan JSON | 可见 label `Plan JSON`。 | 该控件必须只读，只作为审阅证据。 |
| Manifest diff | 可见 label `Manifest diff`。 | 用于写入 manifest 前审阅，不作为 Apply 的事实来源。 |
| Apply 确认 | 确认输入 label 加所选模式显示的精确短语。 | 负向测试应输入接近但错误的短语。 |
| 原生窗口 | 窗口标题 `Agent Routines Manager`。 | 电脑控制启动、重启、调整尺寸、菜单和 DevTools 用例必须使用。 |
| 原生对话框 | 对话框标题、文件名输入框和已选目录 breadcrumb。 | 除测试拒绝目标外，只保存到 `.tmp/`。 |
| 图标证据 | 窗口外框、任务栏、打包可执行文件和 `resources/icon.ico` 尺寸检查。 | 如果宿主可观察图标表面，使用截图证据。 |

## 自动化覆盖映射

| 用例范围 | 主要自动化 | 次要自动化 | 说明 |
| --- | --- | --- | --- |
| ENV-001..ENV-003 | Shell | 电脑控制用于检查打包输出 | 允许生成本地包；签名、上传、tag 和发布不在范围内。 |
| ENV-004..ENV-010 | 电脑控制 | Shell 用于启动诊断 | 需要真实 Electron 窗口、打包元数据、app user-data 行为和进程清理。 |
| SHELL-001..SHELL-007, SHELL-009 | Codex 内置浏览器 | 电脑控制 | Browser preview 覆盖导航、搜索、键盘行为、布局、溢出和响应式行为。 |
| SHELL-008 | 电脑控制 | 无 | 原生菜单行为不属于 Browser preview。 |
| DASH、INV、MAT、POL、DIST、VAL、TASK、DOC、SET 视觉流程 | Codex 内置浏览器 | 电脑控制 | Browser preview 使用确定性 fixture 数据，是最快的回归执行面。 |
| PROJ 保存/打开对话框路径 | 电脑控制 | Browser preview 只覆盖 draft 校验 | 原生文件对话框和真实保存保护需要 Electron IPC。 |
| SEC-001..SEC-010 | 电脑控制 | Browser preview 只做全局暴露 smoke | 打包导航、webview、外部链接、digest 篡改和 IPC 检查需要 Electron runtime。 |
| VIS-001..VIS-010 | Codex 内置浏览器 | 电脑控制 | Browser 覆盖固定 viewport；电脑控制覆盖原生缩放、截图、图标和窗口外框。 |

## 环境与启动

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| ENV-001 | 依赖安装 | 如果 `node_modules` 不存在，在 `apps/agent-routines-manager` 下运行 `npm ci`。 | 依赖从 `package-lock.json` 安装，不改动依赖清单。 |
| ENV-002 | 依赖元数据 | 运行 `npm run check:deps`。 | 命令退出码为 `0`，只列出预期顶层依赖。 |
| ENV-003 | 本地打包 | 运行 `npm run package`。 | 生成 `out/win-unpacked/Agent Routines Manager.exe`；不执行签名、上传、tag 或发布。 |
| ENV-004 | 打包应用启动 | 打开 `out/win-unpacked/Agent Routines Manager.exe`。 | 原生 Electron 窗口打开，标题为 `Agent Routines Manager`，首屏为安装矩阵。 |
| ENV-005 | 开发模式启动 | 运行 `npm run dev`。 | Vite 在 `127.0.0.1:5173` 启动，Electron 打开；关闭 Electron 窗口后开发辅助进程退出。 |
| ENV-006 | 应用重启 | 关闭并重新打开打包应用。 | 应用无崩溃打开，并从 Electron user data 读取本地设置。 |
| ENV-007 | 仓库默认值 | 首次启动或清理 app user data 后检查路径 chip。 | 源仓库解析到本地 checkout，当前 config 解析到 `tools\install-discovery.config.example.json`。 |
| ENV-008 | Browser preview 启动 | 运行 `npm run dev:renderer -- --port 5173`，并在 Codex 内置浏览器打开 `http://127.0.0.1:5173`。 | Browser preview 加载 fixture 数据，显示 `浏览器预览` chip，且不暴露 Electron IPC globals。 |
| ENV-009 | 进程清理 | Browser 或电脑控制测试运行后，关闭窗口并停止 dev server。 | 不残留本次测试启动的 Electron 进程或 `127.0.0.1:5173` listener；清理结果记录为证据。 |
| ENV-010 | 应用图标资产 | 检查 `resources/icon.png`、`resources/icon.ico`、`electron-builder.yml` 和打包输出。 | PNG 和 ICO 非空；ICO 包含 16、24、32、48、64、128 和 256 尺寸；打包应用使用 `resources/icon.ico`。 |

## 应用外壳与导航

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| SHELL-001 | 初始路由 | 启动应用。 | `安装矩阵` / `Install Matrix` 是第一个工作视图，不是 landing page。 |
| SHELL-002 | 侧边栏 | 依次点击仪表盘、清单、安装矩阵、项目、策略、分发、验收、任务中心、文档、设置。 | 每个路由切换标题并渲染真实视图，无 placeholder 文案。 |
| SHELL-003 | Header 操作 | 访问仪表盘、安装矩阵、项目、策略、分发和设置。 | Header 操作与路由范围匹配：刷新/诊断、打开向导、校验/保存、生成计划或诊断。 |
| SHELL-004 | 状态栏 | 在刷新、诊断和运行门禁时观察底部状态栏。 | 展示操作状态、config 状态、任务状态和 shell 标签，且不遮挡内容。 |
| SHELL-005 | 路径 chip | 悬停仓库和 config 路径 chip。 | tooltip 展示完整路径；可见文本在必要时中间截断。 |
| SHELL-006 | 全局搜索输入 | 在顶部搜索框输入已知 routine 名称，如 `desktop-qa`。 | 当前可搜索视图过滤或稳定保留该值；布局不跳动。 |
| SHELL-007 | 窗口尺寸 | 调整到 `1360 x 900` 和 `1024 x 720`。 | 文本保持可读，无明显重叠，主文档不产生横向滚动。 |
| SHELL-008 | 原生菜单 | 使用原生菜单中的 View reload 和缩放控制。 | 应用按正常 Electron 菜单行为重载或缩放。 |
| SHELL-009 | 键盘路由恢复 | Reload 后用键盘焦点经过导航、搜索和当前路由控件。 | 焦点顺序合理，可见焦点保留，当前路由不依赖鼠标也能恢复。 |

## 仪表盘

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| DASH-001 | 摘要计数 | 初始刷新后打开仪表盘。 | Skill 和 workflow 计数与当前 `skills/` 和 `workflows/` 源目录一致。 |
| DASH-002 | Readiness 清单 | 检查 readiness 面板。 | 仓库可读、刷新状态、诊断状态和 config reviewed 状态均可见，并有图标加文本。 |
| DASH-003 | 诊断操作 | 点击 `运行诊断` 或 `重新运行诊断`。 | 按钮显示 busy 反馈；诊断完成后展示 Git、Node、npm、PowerShell、Bash、Python、Python 3 和 `.sh executable bit` 行。 |
| DASH-004 | 活动流 | 运行诊断后回到仪表盘。 | 最近活动展示诊断任务和最新刷新状态。 |
| DASH-005 | 安装矩阵快捷入口 | 在仪表盘点击安装矩阵操作。 | 应用进入安装矩阵，且不丢失当前搜索、主题和语言状态。 |

## 清单

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| INV-001 | 源清单 | 打开清单。 | 每个源 Skill 和 workflow 各出现一次；名称与目录名一致，且不被翻译。 |
| INV-002 | 必需文件 | 检查 Skill 和 workflow 行。 | 完整 routine 显示 `完整`；如存在损坏 routine，显示 `损坏` 并提供缺失文件上下文。 |
| INV-003 | 推荐 workflow | 检查 `SKILL.md` 中含 `Recommended workflows:` 的 Skill。 | 推荐 workflow 名称与源 `SKILL.md` 行一致。 |
| INV-004 | 搜索过滤 | 在顶部搜索输入 `runtime`。 | 清单行过滤为匹配 routine 名称；清空后恢复。 |
| INV-005 | 语言稳定性 | 在清单页切换 English 和简体中文。 | UI 标签切换；routine 名称、路径和命令标识符不翻译。 |

## 安装矩阵

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| MAT-001 | 矩阵列 | 打开安装矩阵。 | 显示 Codex user、Codex project、Claude user、Claude project 和共享 workflow runtime 列。 |
| MAT-002 | 矩阵行 | 比对可见行和源清单计数。 | 无筛选时行数等于当前 Skill 数加 workflow 数。 |
| MAT-003 | 状态摘要 | 检查 legend 和摘要 pill。 | `一致`、`漂移`、`损坏`、`缺失`、`未知`、`共享`、`非目标` 都有图标、翻译文本和计数。 |
| MAT-004 | 类型筛选 | 选择 Skills，再选择 Workflows，再回到全部例程。 | 行更新为匹配类型；清空后恢复完整数量。 |
| MAT-005 | 工具筛选 | 选择 Codex、Claude Code 和共享运行时筛选。 | 可见列和 cell 数更新，选中单元详情不损坏。 |
| MAT-006 | 状态筛选 | 选择每个至少有匹配 cell 的状态。 | 行显示在可见列中包含该状态的 routine。 |
| MAT-007 | 搜索筛选 | 搜索 `electron-app-builder` 后清空。 | 仅保留匹配 routine 行；清空后恢复上一个筛选结果。 |
| MAT-008 | 单元格选择 | 点击一个矩阵状态 cell。 | 右侧详情抽屉更新 routine 名称、源路径、目标路径、状态、变更文件、缺失文件和推荐 workflow。 |
| MAT-009 | Routine 选择 | 点击 routine 名称 cell。 | 详情抽屉选择该 routine 的第一个目标，且内容保持一致。 |
| MAT-010 | 共享和非目标目标 | 选择 workflow 在非 workflow runtime 列的 cell，以及 Skill 在 workflow runtime 列的 cell。 | Workflow 工具列显示 `共享`；Skill workflow runtime 单元显示 `非目标`；二者都不显示误导性安装路径。 |
| MAT-011 | 复制路径 | 点击详情抽屉里的复制按钮。 | 按钮显示复制反馈；空值、shared 值或非目标值不报错。 |
| MAT-012 | 打开文档 | 在详情抽屉点击 `打开`。 | 应用导航到文档页，并选中 routine README 或 Skill instruction 条目。 |
| MAT-013 | 生成计划快捷入口 | 在抽屉点击 `生成 dry-run plan`。 | 应用导航到分发页；计划生成仍受 config 有效性和 dirty 状态门禁控制。 |
| MAT-014 | 刷新 | 在安装矩阵点击刷新。 | 按钮显示 busy 反馈，矩阵数据以只读方式刷新。 |
| MAT-015 | Summary 与项目明细 | 在 summary matrix 和 project detail 间切换，或为 desired routine 打开项目明细抽屉。 | Summary 只聚合 desired targets；明细标明具体项目路径、工具、目标路径、action 和状态。 |
| MAT-016 | Unmanaged 可见性 | 加载包含 unknown 或 unclassified installed items 的 fixture。 | Unknown 和 unclassified 作为 report-only findings 可见，且不计入 desired target 成功。 |
| MAT-017 | 最严重状态上卷 | 使用一个 routine 同时包含 broken、drift、missing、unknown 和 same 状态的 fixture。 | Summary 只在 desired targets 中按 `broken > drift > missing > unknown > same` 上卷。 |

## 项目

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| PROJ-001 | 初始 config | 打开项目页。 | 当前项目根目录、max depth、嵌套仓库模式和排除目录从 active config 加载。 |
| PROJ-002 | 添加 root | 在 Add root 输入 `D:\Workbench` 并点击添加 root。 | root 出现，dirty badge 显示已修改且有效；保存前计划生成被阻止。 |
| PROJ-003 | 编辑 root | 编辑已有 root 字段。 | 对 draft 运行校验，dirty 状态可见。 |
| PROJ-004 | 移除 root | 用删除按钮移除一个 root。 | 该行从 draft 中移除，校验立即更新。 |
| PROJ-005 | Depth 输入 | 在允许范围内修改 discovery depth。 | 值更新且文本不溢出；浏览器原生 number 无效状态可见且受约束。 |
| PROJ-006 | 嵌套仓库切换 | 将 root 在 skip 和 include 间切换。 | Segmented control 状态变化，并更新 draft root option。 |
| PROJ-007 | 添加 exclude | 添加 `tmp-manual-test` 到排除目录。 | token 被添加，并可通过 remove 按钮移除。 |
| PROJ-008 | 重复校验 | 添加重复 project root 或重复 exclude。 | 校验消息显示 `duplicate` 和准确字段路径；分发计划生成被阻止。 |
| PROJ-009 | 校验 active config | 点击 `校验配置`。 | 创建任务，任务中心可展示 command、cwd、stdout/stderr 和最终状态。 |
| PROJ-010 | 取消另存 | 点击 `另存配置...` 并取消原生对话框。 | config 路径不变，无文件写入。 |
| PROJ-011 | 另存到临时文件 | 保存到 `.tmp/manual-test-install-discovery.config.json`。 | 文件写入仓库内但不在安装目标目录；active config path 更新；dirty 状态清除。 |
| PROJ-012 | 项目覆盖列表 | 检查 project overrides 列表。 | 每个 `projectTargets[]` 条目显示 path、enabled 状态、tools、已选 routines、`createTargets` 和 sync mode。 |
| PROJ-013 | 只保留这个项目 | 在一次性项目 override 上使用 `只保留这个项目`。 | Draft 保留该项目启用，针对分发 draft 禁用无关项目/用户默认范围，并保持有效但 dirty 直到保存。 |
| PROJ-014 | `createTargets=false` 的缺失项目 | 将一次性项目 override 指向缺失 target root，且关闭 `createTargets` 后生成 plan。 | Planner 报告 missing targets，但不创建目录、不写安装文件。 |
| PROJ-015 | `createTargets=true` 的一次性项目 | 使用临时项目目录并启用 `createTargets`，然后生成 dry-run plan。 | Plan 只在审阅输出中展示 create/install actions；Apply 前不写目标目录。 |

## 策略

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| POL-001 | 策略分区 | 打开策略页。 | User-level Skills、禁止提升到用户级的 Skills、User Workflows 和 Project Workflows 分区可见。 |
| POL-002 | Checkbox 选择 | 在每个分区勾选和取消勾选一个 routine。 | selected strip 更新，draft validation 重新运行。 |
| POL-003 | 移动选中项 | 使用 selected policy token 的上移/下移。 | 顺序变化；首项和末项的边界按钮禁用。 |
| POL-004 | 源状态 | 检查 routine 行。 | 每个 routine 都有完整/损坏状态，并包含图标加文本。 |
| POL-005 | 校验面板 | 如能通过 draft 创建重复或 missing-source 条件。 | 校验面板展示准确字段路径；修复并保存前计划生成被阻止。 |
| POL-006 | 保存策略 draft | 将修改后的策略 draft 保存到临时 config 路径。 | 保存后的 config 是有效 JSON，active config path 更新。 |
| POL-007 | Promotion rule 文案 | 检查 `禁止提升到用户级的 Skills` 或等价 promotion rule 分区。 | 它被描述为用户级提升约束，而不是项目安装目标。 |
| POL-008 | 用户默认与项目默认 | 为 user defaults 选择一个 Skill 或 workflow，为 project defaults 选择另一个。 | Draft 保留独立 desired-state scope，不会静默在 user 和 project targets 间移动 routine。 |
| POL-009 | 项目特定覆盖 | 只为一个 project override 选择 routine。 | 后续审阅输出只把它解析到该项目，而不是所有发现项目。 |

## 分发

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| DIST-001 | 初始向导 | 用干净有效 config 打开分发页。 | Stepper 显示 Choose Scope、Select Routines、Review Targets、Apply Mode、Run & Verify、Result；门禁清单可见。 |
| DIST-002 | 生成 dry-run plan | 点击 `生成 dry-run plan`。 | 任务通过白名单 generator 运行；Plan JSON 出现；任务中心收到 generate plan 任务。 |
| DIST-003 | Dirty config 阻断 | 修改项目或策略但不保存，然后打开分发页。 | 生成计划按钮禁用，并显示 dirty-config 原因。 |
| DIST-004 | 无效 config 阻断 | 创建重复 config 项后打开分发页。 | 生成计划按钮禁用，并显示 invalid-config 或校验问题。 |
| DIST-005 | Apply 禁用 | 检查 `Apply`。 | 它保持禁用，并有安全 tooltip/原因。 |
| DIST-006 | 破坏性模式受保护 | 选择 `replace-listed` 或 `sync-prune`。 | 精确确认短语和备份要求满足前 Apply 保持禁用。 |
| DIST-007 | Plan 保持 | 生成 plan，导航到其他页面再返回。 | 当前会话内 plan output 仍可见，除非被 config 编辑失效。 |
| DIST-008 | 无静默写入 | 生成 dry-run plan 后检查 git status。 | 计划生成不修改源文件或安装目标文件。 |
| DIST-009 | Apply mode 短语 | 依次选择 `dry-run`、`merge`、`replace-listed` 和 `sync-prune`。 | 必需确认文本按模式变为无写入、`APPLY`、`REPLACE <N> TARGETS` 或 `SYNC PRUNE <N> TARGETS`。 |
| DIST-010 | Merge 确认 | 生成包含 missing targets 的 manifest，选择 `merge` 并输入 `APPLY`。 | Apply 只能针对 merge-safe install actions 启用；已有目标保持 skip actions。 |
| DIST-011 | Replace 确认负向 | 选择 `replace-listed`，输入旧式 force 短语或错误 target count。 | Apply 保持禁用或被拒绝；只有精确 `REPLACE <N> TARGETS` 短语能通过。 |
| DIST-012 | Sync-prune 确认负向 | 选择 `sync-prune`，输入错误短语，或在没有 backup/restore plan 时运行。 | Apply 保持禁用或被拒绝；prune candidates 在 safeguards 存在前只用于审阅。 |
| DIST-013 | Digest mismatch 阻断 | 生成 manifest 后修改 config 或 manifest input，再尝试应用 stale plan。 | Apply 因 digest 或 stale-plan 原因被阻断，必须重新生成。 |
| DIST-014 | Plan 失效 | 生成 plan，编辑项目或策略，再返回分发页。 | Write manifest 和 Apply 禁用，直到从已保存 config 重新生成 plan。 |
| DIST-015 | Dry-run only 模式 | 选择 dry-run only 并走完 Run & Verify。 | 只运行校验和计划输出；不 install、replace、prune 或写目标。 |
| DIST-016 | Unknown report-only | 用包含 unknown 或 unclassified installed items 的输入生成 plan。 | 它们在审阅和结果摘要中作为 report-only 出现；没有任何模式自动 prune 它们。 |

## 验收

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| VAL-001 | 门禁列表 | 打开验收页。 | AGENTS 门禁集合的 PowerShell 和 Bash 行都存在：structure、skills、workflows、docs、changelog、manifest、install discovery config、run-workflows。 |
| VAL-002 | 选择门禁 | 点击一个门禁行名称。 | 输出面板展示该门禁的命令预览。 |
| VAL-003 | 运行 PowerShell 门禁 | 运行 PowerShell `validate-structure`。 | 任务状态变为成功或失败，并带精确 stdout/stderr；不发生写入。 |
| VAL-004 | 运行 Bash 门禁 | Bash 可用时运行一个 Bash 门禁。 | 任务状态和输出反映真实 shell 结果；Bash 缺失时以平台缺口或失败命令证据展示。 |
| VAL-005 | Manifest 参数 | 选择 `validate-manifest`。 | 命令预览包含仓库 manifest 路径参数。 |
| VAL-006 | Install config 参数 | 选择 `validate-install-discovery-config`。 | 命令预览包含示例 config 参数。 |
| VAL-007 | 任务交接 | 运行门禁后打开任务中心。 | 同一个门禁任务带 command metadata 和 output 出现。 |
| VAL-008 | 重复运行 | 同一门禁运行两次。 | 新证据出现，且不破坏或重复无关任务行。 |
| VAL-009 | 缺失另一种 shell 分类 | 在缺少 Bash 或 PowerShell 的受控主机上运行不可用 shell 的门禁。 | UI 用精确命令证据记录失败或平台缺口，不把无关仓库检查误标为失败。 |
| VAL-010 | 门禁选择保持 | 选择一个门禁，运行另一个门禁，导航离开再返回。 | 选中输出保持一致，绝不把另一个门禁的 stdout/stderr 当作当前输出。 |

## 任务中心

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| TASK-001 | 空状态 | 未运行任务前打开任务中心。 | 空状态清晰，不像损坏页面。 |
| TASK-002 | 队列行 | 运行诊断、计划生成或验收门禁后打开任务中心。 | 队列展示任务标题和状态。 |
| TASK-003 | 日志检查器 | 选择每个任务行。 | 日志面板展示 argv、stdout、stderr、cwd 和可用的最终状态。 |
| TASK-004 | 失败命令证据 | 在受控测试主机上运行预期失败的门禁或缺失 shell。 | 失败状态保留 stderr 和非零 exit code。 |
| TASK-005 | 脱敏抽查 | 如果受控 fixture 的命令输出包含 token-like 文本，检查任务中心。 | 展示日志中的疑似 secret 值被脱敏。 |
| TASK-006 | 持久化边界 | 重启应用。 | 除非未来明确实现本地持久化，否则内存任务队列被清空。 |
| TASK-007 | 取消安全 | 在可取消能力存在时启动一个长时间运行的验收或诊断任务。 | 只有正在运行且可取消的任务显示 cancel；完成任务不能事后取消。 |
| TASK-008 | 归档证据 | 如果执行归档写入已暴露，为已完成 apply 或 verify 任务运行归档。 | 归档输出是单独确认动作，记录 README/result/evidence/artifact 路径，且不修改安装目标。 |

## 文档

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| DOC-001 | 文档列表 | 打开文档页。 | 白名单文档出现，包括 Electron plan、UI design、prerequisites、人工测试用例、install discovery、release process、README 条目和 routine docs。 |
| DOC-002 | 预览 | 选择 `Electron 应用人工测试用例`。 | 预览展示 headings、summary、文件路径和正文预览。 |
| DOC-003 | Skill 文档 | 选择一个 Skill README 和一个 Skill instruction 条目。 | 预览内容和 headings 与源文件一致。 |
| DOC-004 | Workflow 文档 | 选择一个 workflow README。 | 预览内容和 headings 与源 workflow 文件一致。 |
| DOC-005 | 打开文档 | 在可用位置使用 docs open 操作。 | 应用只通过 OS 打开白名单 docs，任务中心记录成功或 OS 错误。 |
| DOC-006 | 路径安全 | 尝试从 UI 推断或请求任意文件系统路径。 | UI 只暴露已知 docs 条目，不提供通用文件浏览器。 |
| DOC-007 | 分发向导文档 | 分别用英文和简体中文搜索 distribution guide UI 文档。 | 两种语言条目都在白名单中可见，并预览当前引导式分发流程。 |
| DOC-008 | 人工测试文档同步 | 用两种语言选择本人工测试文档。 | 用例 ID 在两种语言间对齐；不存在只在英文或只在中文出现的用例 ID。 |

## 设置、主题和语言

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| SET-001 | 浅色主题 | 打开设置并选择浅色。 | 主题立即变化；UI 中可见 `html[data-theme="light"]` 行为。 |
| SET-002 | 深色主题 | 选择深色。 | 主题立即变化；对比度可读，状态颜色仍可区分。 |
| SET-003 | 随系统主题 | 选择随系统。 | 重启或 Electron native theme 变化时跟随宿主偏好。 |
| SET-004 | 主题持久化 | 选择深色并重启应用。 | 深色主题仍被选中。 |
| SET-005 | 英文 | 选择 English。 | 标题和标签无需重启切换为英文。 |
| SET-006 | 简体中文 | 选择简体中文。 | 标题和标签无需重启切回中文。 |
| SET-007 | 语言持久化 | 选择 English 并重启应用。 | English 仍被选中。 |
| SET-008 | 路径复制 | 点击仓库和 active config 路径的复制按钮。 | 显示复制反馈；如果 clipboard 权限受限，也无可见错误。 |
| SET-009 | 运行时诊断 | 在设置中运行诊断。 | Runtime readiness 列表更新，并包含精确命令输出详情。 |
| SET-010 | 系统主题变化 | 选择随系统后，改变 OS 主题或模拟 native theme 事件。 | 应用跟随新的 native theme，且不丢失路由、搜索或 draft form 状态。 |
| SET-011 | Dirty draft 下切换语言 | 创建一个 dirty Projects 或 Policy draft，切换语言再返回。 | Draft 状态、校验问题和禁用动作原因在语言切换后保留。 |

## 桌面集成与安全

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| SEC-001 | Context isolation | 打开 DevTools，检查 `window.agentRoutines`、`window.require` 和 `window.process`。 | 只暴露 typed `agentRoutines` API；renderer 不能直接访问 Node API。 |
| SEC-002 | IPC 形态 | 在 DevTools 检查 `window.agentRoutines` 的 keys。 | 存在命名 API 分组；没有 generic `invoke` 或 shell 执行函数。 |
| SEC-003 | 导航保护 | 尝试打开任意本地文件，或把 `window.location` 改到非 dev 外部 URL。 | 打包应用阻止非预期导航。 |
| SEC-004 | 外部链接 | 如果 docs preview 中存在外部链接，点击它。 | 外部 URL 通过 OS 浏览器打开，不在 Electron renderer 内导航。 |
| SEC-005 | Webview 阻断 | 确认 UI 不创建 webview，且 DevTools 无法通过 app content 附加 webview。 | 主进程阻止 webview attach。 |
| SEC-006 | 保存目标保护 | 尝试把 config 保存到 `.codex`、`.claude` 或 `.agent-routines`。 | 保存被拒绝，因为安装目标目录不是源位置。 |
| SEC-007 | 命令白名单 | 触发校验 config、生成 plan 和验收门禁。 | 命令使用主进程白名单中的固定 executable 和 argument arrays。 |
| SEC-008 | 无 Apply 绕过 | 检查是否存在任何 route、菜单或 DevTools 暴露 UI 命令可无确认运行 Apply。 | 不存在绕过；merge、replace-listed、sync-prune 都要求明确确认。 |
| SEC-009 | Manifest 篡改阻断 | 篡改已生成 manifest，或通过任意暴露 apply 路径重放 stale manifest。 | Apply 被 digest 或 reviewed-manifest mismatch 阻断；应用不会执行未审阅 JSON 文本。 |
| SEC-010 | 安装目标非源规则 | 检查所有 browse、save、open 和 apply surface。 | `.codex`、`.claude` 和 `.agent-routines` 下的 runtime targets 永远不被当作权威源仓库。 |

## 视觉、交互和可访问性验收

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| VIS-001 | 文本适配 | 在 `1360 x 900` 和 `1024 x 720` 检查每个路由。 | 无按钮、pill、表格 cell 或抽屉文本出现明显重叠。 |
| VIS-002 | 状态可访问性 | 在浅色和深色主题检查状态 pill。 | 每个状态都有图标加文本，不只依赖颜色。 |
| VIS-003 | 键盘焦点 | 在当前路由用 Tab 遍历。 | 焦点环可见，并遵循合理顺序。 |
| VIS-004 | 表单控件 | 用键盘编辑项目和策略控件。 | 输入框、checkbox、segmented control 和按钮都可用键盘触达。 |
| VIS-005 | 复制反馈 | 使用路径和抽屉中的复制按钮。 | 反馈出现，且不会严重改变周边布局尺寸。 |
| VIS-006 | Busy 状态 | 执行刷新、诊断和门禁。 | 按钮显示 busy/disabled 状态，并在完成后恢复。 |
| VIS-007 | 长路径 | 如有长仓库/config 路径，使用它测试。 | 路径中间截断，有 tooltip/复制能力，且不溢出。 |
| VIS-008 | 命令输出 | 运行输出较多的门禁。 | 输出面板保持可读和可滚动；状态栏始终可见。 |
| VIS-009 | 截图裁切 | 在 `1280 x 720`、`1360 x 900` 和较窄桌面宽度截图。 | 主内容、路由标题、状态栏和当前抽屉/对话框可见，且不被固定定位 UI 裁掉。 |
| VIS-010 | 图标可读性 | 检查 16、24、32、48、128 和 256 像素尺寸下的应用图标。 | 小尺寸仍能识别，不依赖微小文字或低对比细节。 |

## Codex 内置浏览器自动化用例

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| BROW-001 | Browser preview 标记 | 通过 Codex 内置浏览器打开 `http://127.0.0.1:5173`，或运行 `npm run test:ui`。 | `浏览器预览` 可见，应用从安装矩阵开始，并在没有 Electron IPC 的情况下加载 fixture 数据。 |
| BROW-002 | 全局暴露边界 | 在 Browser preview 中检查 `window.agentRoutines`、`window.require` 和 `window.process`。 | 三者都不暴露给 renderer 内容；preview 使用本地 fallback API 模块。 |
| BROW-003 | 默认 viewport 响应式 | 运行 `browser-default-chromium` Playwright project，或在 `1280 x 720` 检查。 | 文档不出现横向溢出；topbar 和路径 chip 不碰撞。 |
| BROW-004 | 无效 config 阻断 | 添加重复 project root，例如 `D:\Work\Projects`，再打开分发页。 | Draft validation 显示 `duplicate`，分发页阻止计划生成。 |
| BROW-005 | Policy 编辑排序 | 把 `api-sync` 加入 User-level Skills，并向上移动。 | Selected policy strip 更新，移动按钮遵守边界，draft 保持有效。 |
| BROW-006 | Plan 编辑安全 | 生成 dry-run plan 并检查 Plan JSON。 | Plan JSON 只读；Apply 使用生成的 manifest 和所选模式确认短语。 |
| BROW-007 | 任务证据交接 | 在 Browser preview 中运行一个验收门禁，再打开任务中心。 | 任务中心展示 command metadata 和 `Browser preview task evidence.` 输出。 |
| BROW-008 | Docs 白名单 | 搜索一个已知 routine 文档，再搜索不存在的任意路径。 | 已知文档可正确过滤；任意路径不会创建文件浏览器或动态文件系统访问。 |
| BROW-009 | 路由扫描 | 在 Browser preview 中用默认 fixture data 访问每个主路由。 | 每个路由都渲染真实工作视图，不出现 placeholder 页面，也不引入 console error。 |
| BROW-010 | 矩阵筛选和抽屉 | 组合矩阵搜索、类型、工具和状态筛选，然后打开详情抽屉。 | 筛选状态保持稳定，抽屉内容与选中的可见行/cell 一致。 |
| BROW-011 | 引导式 dry-run 流程 | 用 fixture data 走完分发六步并生成 dry-run plan。 | Stepper 状态、action table、只读 Plan JSON 和结果摘要在无原生 IPC 下保持一致。 |
| BROW-012 | 破坏性短语拒绝 | 在 Browser preview 中对破坏性模式尝试旧式 force 文案、错误数量和错误大小写。 | UI 拒绝错误短语，绝不把破坏性 Apply 标为安全。 |
| BROW-013 | Dirty draft 阻断 | 编辑项目或策略后不保存，直接进入分发页。 | Generate、write manifest 和 Apply 控件保持禁用，并显示 dirty-config 原因。 |
| BROW-014 | Docs 分发向导 | 在文档页搜索 distribution guide UI 和 manual test cases。 | 两份文档都可见、可预览，并且不会访问任意文件系统路径。 |
| BROW-015 | 响应式扫描 | 在 `1280 x 720`、`1360 x 900` 和 `1024 x 720` 采集 Browser 截图。 | 不出现文档级横向溢出、工具栏裁切或长文本重叠。 |
| BROW-016 | 纯键盘扫描 | 用 Tab、Shift+Tab、Enter、Space 和 Escape 操作导航、筛选、抽屉和对话框。 | 焦点可见，对话框可关闭，控件不会意外困住焦点。 |
| BROW-017 | 不声明原生覆盖 | 记录 Browser 结果前确认 `window.agentRoutines` 不可用且 preview chip 可见。 | 证据明确说明 Browser preview 不能验证原生 IPC、菜单、对话框或打包导航。 |
| BROW-018 | Fixture 重置 | 在两次 Browser 运行之间重置 fixture-backed state。 | 第二次运行从确定性默认状态开始，不受上一次 draft 编辑污染。 |

## 电脑控制自动化用例

| ID | 区域 | 步骤 | 预期结果 |
| --- | --- | --- | --- |
| CTRL-001 | 打包应用启动 | 用电脑控制启动 `out/win-unpacked/Agent Routines Manager.exe`。 | 原生窗口出现，标题为 `Agent Routines Manager`，首个视图为安装矩阵。 |
| CTRL-002 | 原生菜单 | 使用 Electron View 菜单执行 reload、zoom in、zoom out 和 reset zoom。 | 原生菜单动作生效，应用不崩溃且不破坏路由状态。 |
| CTRL-003 | 原生保存取消 | 打开项目页，点击 `另存配置...`，并取消保存对话框。 | 不写入文件，active config path 不变化。 |
| CTRL-004 | 原生保存保护 | 尝试把 config 保存到 `.codex`、`.claude` 或 `.agent-routines` 下。 | 应用服务拒绝保存，安装目标保持未修改。 |
| CTRL-005 | 外部跳转 | 在包含外部链接的 docs preview 中点击链接。 | URL 通过 OS 浏览器打开；Electron renderer 不离开当前应用。 |
| CTRL-006 | DevTools 安全 smoke | 从原生菜单打开 DevTools 并检查 renderer globals。 | 只有 Electron 中存在 typed `window.agentRoutines`；直接 Node globals 仍不可用。 |
| CTRL-007 | 重启持久化 | 修改主题和语言，关闭应用，再重新打开。 | 设置通过 Electron user data 持久化；除非以后明确实现，任务队列仍只保存在内存中。 |
| CTRL-008 | 窗口边界 | 调整大小、最大化、还原，并在较窄桌面宽度测试。 | 导航、状态栏、抽屉、对话框和长路径仍可用，无明显重叠。 |
| CTRL-009 | 图标表面 | 打包后检查原生窗口外框、任务栏图标、可执行文件图标和 app resources。 | 所有可见图标表面使用已审阅应用图标；宿主不可观察的表面需用截图证据标注。 |
| CTRL-010 | 打包 smoke 时长 | 保持打包应用打开至少一分钟，同时导航路由并打开抽屉。 | 应用保持响应，不生成失控子进程。 |
| CTRL-011 | 原生保存到临时文件 | 用原生保存对话框把 config 保存到 `.tmp/manual-test-install-discovery.config.json`。 | 文件只写到 `.tmp/`；active config path 更新；运行结束后清理该临时文件。 |
| CTRL-012 | 原生保存拒绝路径 | 用原生保存对话框选择 `.codex`、`.claude` 或 `.agent-routines`。 | 应用拒绝保存并显示错误；目标目录保持不变。 |
| CTRL-013 | Manifest digest 保护 | 生成 plan 后修改 config，再尝试从 stale review 应用。 | 原生 Electron 路径阻止 Apply，并报告 stale 或 digest mismatch 状态。 |
| CTRL-014 | 外部链接跳转 | 从打包应用点击 docs 外部链接。 | OS 浏览器收到 URL；Electron renderer 仍停留在应用路由内。 |
| CTRL-015 | 原生 reload 恢复 | 在项目、策略和分发页通过原生菜单 reload。 | 应用无崩溃重载，恢复已持久化设置，且不静默应用未保存 draft。 |
| CTRL-016 | 破坏性确认负向 | 在原生应用中选择 replace 或 sync-prune，并输入错误短语。 | Apply 保持禁用或被拒绝；不会运行 backup、replace 或 prune 操作。 |
| CTRL-017 | Config path 重启 | 保存临时 config，重启，然后恢复默认 config。 | 应用加载持久化的临时 config path；显式恢复后回到仓库默认 config。 |
| CTRL-018 | 原生清理 | 电脑控制自动化后关闭所有窗口并停止 dev helper 进程。 | 不残留本次测试启动的 Electron 或 Vite 进程；清理说明包含临时文件和安装目标状态。 |

## 自动化证据清单

完整全自动化通过时记录这些产物：

- `npm run test:ui`、`npm run package` 和仓库验证门禁的 shell 记录。
- Browser-preview 失败时的 Playwright report 或 trace 目录。
- `1280 x 720` 默认 viewport 的 Codex 内置浏览器截图。
- 打包应用启动、图标表面、原生菜单、保存对话框取消、DevTools 安全 smoke、破坏性确认拒绝和重启持久化的电脑控制截图。
- 清理说明：确认 `.tmp/` 下临时 config 文件已删除，且安装目标未被修改。
- 机器可读结果日志，包含用例 ID、执行面、结果、断言摘要、产物路径、清理状态，以及相关不适用原因。

## 回归门禁清单

人工测试通过前运行这些自动检查：

```powershell
Set-Location apps\agent-routines-manager
npm run check:deps
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
npm run package
Set-Location ..\..
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
cd apps/agent-routines-manager
npm run check:deps
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
npm run package
cd ../..
./tests/validate-structure.sh
./tests/validate-skills.sh
./tests/validate-workflows.sh
./tests/validate-docs.sh
./tests/validate-changelog.sh
./tests/validate-manifest.sh --manifest-path ./distribution/agent-routines.manifest.json
./tests/validate-install-discovery-config.sh --config-path ./tools/install-discovery.config.example.json
./tests/run-workflows.sh
```
