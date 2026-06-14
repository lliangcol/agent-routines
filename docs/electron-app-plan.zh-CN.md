# Electron 应用执行规范

本文档定义未来 Electron 桌面应用的执行契约。该应用用于管理 Agent Routines 的清单、安装发现、manifest 生成、分发、校验和审计记录。它是本仓库的本地操作控制台，必须复用现有脚本和仓库契约，而不是另建一套分发规则。

界面布局、视觉 tokens 和交互规则详见 [Electron 应用 UI 设计图](electron-app-ui-design.zh-CN.md)。机器设置和可重复依赖安装详见 [Electron 应用提前安装和准备清单](electron-app-prerequisites.zh-CN.md)。

## 产品范围

应用名称为 `Agent Routines Manager`。

MVP 必须包含：

- 当前仓库 `skills/*` 和 `workflows/*` 的资源清单。
- 用户级和项目级安装状态扫描。
- 基于已审阅根目录的项目发现。
- 分发策略编辑。
- install discovery 配置创建、编辑和校验。
- dry-run 计划生成。
- manifest 审阅、diff 和写入。
- 显式执行分发。
- 安装后完整性检查。
- 仓库验证门禁。
- 环境诊断。
- 只允许白名单命令的安全执行。
- 源目录到目标目录的 drift 对比。
- 任务日志和写入任务单队列。
- 与 `executions/YYYY/MM/...` 兼容的执行归档。
- 文档入口。
- 全局语言切换：简体中文和英文。
- 主题切换：浅色、深色、随系统。
- Windows、macOS 和 Linux 界面支持。

## 非目标

- 不为 Skills、workflows、manifest 或 install discovery 策略创建第二套事实来源。
- 不扫描全盘。
- 不执行 renderer 传入的任意 shell 文本。
- 不静默启用 force 覆盖。
- 不提交用户级插件、MCP 或机器相关应用设置。
- 不把已安装目录当成维护源。

## Electron 架构

使用标准 Electron 分层：

| 层级 | 职责 |
| --- | --- |
| Main process | 文件系统访问、OS 检测、安全命令执行器、任务队列、原生对话框、归档写入。 |
| Preload | 类型化 IPC 桥，只暴露窄白名单。不提供通用 shell 或文件系统 API。 |
| Renderer | 仅负责 UI：清单、矩阵、策略编辑器、向导、校验、日志、设置。 |
| Local store | 用户偏好和最近配置路径。除非显式导出，否则不得进入 tracked source。 |

必需安全设置：

- `contextIsolation: true`
- `nodeIntegration: false`
- 除非存在明确 Electron 限制，否则使用 `sandbox: true`
- 禁用 remote module。
- IPC handler 必须先校验参数。
- 命令必须来自仓库拥有的白名单，不能由 UI 原始字符串拼接。

## 源码布局契约

应用实现必须保留在 `apps/agent-routines-manager` 下。除共享仓库文档或校验脚本外，不要在仓库根目录添加 Electron 源码文件。

实现应收敛到以下布局：

```text
apps/agent-routines-manager/
  src/
    main/
      index.ts
      ipc.ts
      command-registry.ts
      task-queue.ts
      services/
        inventory-service.ts
        install-discovery-service.ts
        validation-service.ts
        diagnostics-service.ts
        archive-service.ts
        settings-store.ts
    preload/
      index.ts
    shared/
      contracts.ts
      schemas.ts
      i18n-keys.ts
    renderer/
      main.tsx
      App.tsx
      routes/
      components/
      i18n/
      styles/
      tests/
```

实现规则：

- `src/shared/contracts.ts` 维护 DTO 名称、任务状态、状态 key、命令 ID 和 IPC 请求/响应类型。
- `src/shared/schemas.ts` 维护运行时校验 schema，使用 `zod` 或已经批准的等价运行时校验器。
- Renderer 代码只能从 `src/shared/` 和 `src/renderer/` 导入，不能从 `src/main/` 导入。
- Preload 只暴露一个类型化 API 对象。不得暴露 `ipcRenderer`、Node 文件系统 API、process API 或通用命令执行器。
- Main process services 可以调用仓库脚本、读取源文件、写入已批准应用产物并使用原生对话框。
- 实现完成时，`package.json` 必须提供 `dev`、`build`、`typecheck`、`lint`、`format`、`test`、`test:ui`、`check:deps`、`package` 和 `dist` scripts。
- 生成的应用输出不进入 git：`node_modules/`、Playwright 和 Electron cache、`dist/`、`out/`、`release/`、logs、coverage 和临时文件。

## 命令集成

应用必须调用现有仓库入口：

| 操作 | Windows | macOS/Linux |
| --- | --- | --- |
| 校验配置 | `tests\validate-install-discovery-config.ps1 -ConfigPath <path>` | `tests/validate-install-discovery-config.sh --config-path <path>` |
| 生成计划 | `tools\generate-install-manifest.ps1 -ConfigPath <path>` | `tools/generate-install-manifest.sh --config-path <path>` |
| 写入 manifest | `tools\generate-install-manifest.ps1 -ConfigPath <path> -WriteManifest` | `tools/generate-install-manifest.sh --config-path <path> --write-manifest` |
| merge 应用 | `tools\generate-install-manifest.ps1 -ConfigPath <path> -WriteManifest -Apply -ApplyMode merge` | `tools\generate-install-manifest.sh --config-path <path> --write-manifest --apply --mode merge` |
| replace-listed | `tools\generate-install-manifest.ps1 -ConfigPath <path> -WriteManifest -Apply -ApplyMode replace-listed` | `tools\generate-install-manifest.sh --config-path <path> --write-manifest --apply --mode replace-listed` |
| sync-prune | `tools\generate-install-manifest.ps1 -ConfigPath <path> -WriteManifest -Apply -ApplyMode sync-prune` | `tools\generate-install-manifest.sh --config-path <path> --write-manifest --apply --mode sync-prune` |
| 仓库门禁 | `AGENTS.md` 中的全部验证命令 | `AGENTS.md` 中的全部验证命令 |

renderer 可以预览计划中的 `commandsToRun`，但实际执行必须始终经过 main process 的命令白名单。

### 命令白名单契约

Main process 必须注册命令 ID，并为每个命令提供固定 executable 路径、固定参数模板和经过校验的占位参数。不得接收 renderer 传入的原始 shell 文本。

| 命令 ID | 是否写入 | 确认要求 | 参数 |
| --- | --- | --- | --- |
| `validateInstallConfig` | 否 | 不需要 | `configPath` |
| `generateInstallPlan` | 否 | 不需要 | `configPath` |
| `writeManifest` | 是，写入 generator 输出指定的仓库 manifest/report 路径 | 必需 | `configPath` |
| `applyDistribution` | 是，写入已审阅 manifest 指定的安装目标 | 必需 | `configPath` |
| `destructiveApplyDistribution` | 是，执行 replace-listed 或 sync-prune 目标变更 | 精确破坏性确认短语，并要求 backup/restore plan | `configPath`, `mode`, `confirmationText`, `manifestDigest` |
| `runRepositoryGate` | 否 | 不需要 | `gateId`, `shell` |
| `checkInstallTarget` | 否 | 不需要 | `tool`, `scope`, optional `projectPath` |

命令执行器规则：

- 使用参数数组（`spawn` 或 `execFile`），不要拼接 shell 字符串。
- 仓库命令以源仓库作为 `cwd`。
- 脚本路径从选中的源仓库根目录解析；拒绝位于已审阅仓库或已审阅 config 文件位置之外的路径。
- 展示前将路径规范化为结构化值，但 UI 显示原生路径。
- 记录命令 ID、executable、args、cwd、shell kind、开始时间、结束时间、耗时、退出码、stdout、stderr 和取消状态。
- 脱敏 secrets，避免打印完整环境变量。
- 将缺失 shell、缺失 executable bit、宿主机工具缺失分类为诊断或平台缺口，不能因此静默切换到另一条写入路径。

## 数据与 IPC 契约

所有 IPC payload 在使用前必须由 main process 校验。共享类型至少应包括：

```ts
type PlatformKind = "windows" | "macos" | "linux";
type ThemeMode = "light" | "dark" | "system";
type LanguageCode = "en" | "zh-CN";
type RoutineKind = "skill" | "workflow";
type InstallStatus = "same" | "drift" | "broken" | "missing" | "unknown" | "shared" | "not-targeted";
type TaskState = "pending" | "running" | "succeeded" | "failed" | "canceled";

interface RoutineItem {
  name: string;
  kind: RoutineKind;
  sourcePath: string;
  recommendedWorkflows: string[];
  hasRequiredFiles: boolean;
  includedByDefault: boolean;
}

interface InstallMatrixCell {
  routineName: string;
  kind: RoutineKind;
  tool: "codex" | "claude-code" | "shared-workflow-runtime";
  scope: "user" | "project";
  status: InstallStatus;
  sourcePath?: string;
  targetPath?: string;
  missingFiles: string[];
  changedFiles: string[];
}

interface TaskRecord {
  id: string;
  commandId: string;
  state: TaskState;
  startedAt?: string;
  endedAt?: string;
  exitCode?: number;
  cwd: string;
  argv: string[];
}

interface AppSettings {
  sourceRepositoryPath: string;
  activeConfigPath?: string;
  theme: ThemeMode;
  language: LanguageCode;
  recentProjectRoots: string[];
}
```

Preload API 必须暴露具名操作，而不是通用 `invoke(channel, payload)` wrapper。必需 IPC 操作：

| IPC 操作 | 用途 |
| --- | --- |
| `settings.get` / `settings.update` | 加载并持久化仓库外的本地应用设置。 |
| `inventory.scan` | 读取源 Skills、workflows、catalog metadata 和 workflow 推荐关系。 |
| `installConfig.open` / `installConfig.validate` / `installConfig.saveAs` | 处理已审阅 install discovery configs。 |
| `plan.generate` | 运行 dry-run generator，返回解析后的 plan JSON 和原始命令证据。 |
| `manifest.write` | 通过 generator 写入已审阅 manifest。 |
| `distribution.apply` | 根据明确确认状态应用已审阅 manifest。 |
| `validation.runGate` | 运行一个仓库验证门禁或选中的安全门禁组。 |
| `diagnostics.run` | 检查宿主机工具、shell、executable bit、路径和仓库可读性。 |
| `tasks.list` / `tasks.subscribe` / `tasks.cancel` | 展示队列状态、流式日志，并取消可安全终止的子进程。 |
| `archive.write` | 成功 apply 后，或 dry-run 证据被请求时，写入已批准执行归档。 |
| `dialogs.pickFile` / `dialogs.pickDirectory` | 从 main process 使用原生对话框。 |
| `docs.list` / `docs.open` | 打开仓库文档，但不暴露任意文件系统访问。 |

## 功能模块

### Dashboard

展示仓库路径、当前配置路径、当前语言、当前主题、源资源数量、扫描状态、校验状态和最近任务结果。

### Inventory

从源仓库列出每个 Skill 和 workflow。展示路径、类型、源文件完整性、是否进入默认策略，以及安装状态摘要。

### Install Matrix

跨 Codex、Claude Code 和共享 workflow runtime 展示用户级与项目级目标。状态值：

- `same`：已安装内容与源目录一致。
- `drift`：已安装内容与源目录不同。
- `broken`：预期文件缺失。
- `missing`：策略要求但尚未安装。
- `unknown`：目标存在，但源仓库没有对应项。
- `shared`：workflow runtime 是共享目标，不按工具复制两份。
- `not-targeted`：当前配置没有为该 routine 选择这个目标。

点击单元格应打开源路径、目标路径、文件级对比和建议动作。

### Projects

编辑项目根目录、发现深度、排除目录和嵌套仓库行为。项目发现必须沿用现有 install discovery 配置结构。

### Policy

编辑：

- `userTargets`
- `projectDefaults`
- `projectTargets`
- `promotionRules.doNotPromoteToUserSkills`

生成计划前必须校验重复名称、非法名称和源目录不存在项。

### Distribute Wizard

使用带门禁的流程：

1. Choose Scope
2. Select Routines
3. Review Targets
4. Apply Mode
5. Run & Verify
6. Result

配置校验和计划生成通过前，`Apply` 必须禁用。`replace-listed` 和 `sync-prune` 必须要求精确确认短语和 backup/restore plan。

### Validation

暴露 `AGENTS.md` 中的完整仓库门禁，覆盖 PowerShell 和 Bash。UI 必须展示命令、shell、退出码、stdout、stderr 和耗时。

### Environment Diagnostics

检查：

- Git 是否可用。
- PowerShell 是否可用。
- Bash 是否可用。
- Bash helper 路径所需的 Python 或 `python3` 是否可用。
- `.sh` 文件在 git index 中是否具备 executable bit。
- OS、shell 和路径分隔符行为。
- 应用是否可以读取源仓库和选中的配置文件。

诊断可以给出警告，但只有在请求的操作无法执行时才阻断。

### Task Center

所有写入或安装任务必须经过单任务队列。UI 必须展示 `pending`、`running`、`succeeded`、`failed`、`canceled`。长时间命令应流式输出日志，并在能够安全终止子进程时支持取消。

### Audit Archive

成功 apply 后，应用应提供写入执行归档的选项：

```text
executions/YYYY/MM/YYYY-MM-DDTHHmm+ZZZZ-agent-routines-manager/
  README.md
  result.md
  evidence/commands.md
  artifacts/plan.json
  artifacts/manifest.json
```

dry-run 任务不得自动归档，除非操作者明确要求。

## 主题要求

应用必须支持：

- `light`
- `dark`
- `system`

实现规则：

- 使用 design tokens 管理颜色、间距、字体、边框、焦点和状态。
- 将选中的主题持久化到本地应用设置。
- 选择 `system` 时跟随 Electron `nativeTheme`。
- 状态不能只依赖颜色表达，必须同时使用文本或图标。
- 浅色和深色主题都要校验对比度。
- 避免装饰性渐变、通用 AI 风格发光、漂浮色块、超大 hero 区域和单色系界面。

## 语言要求

应用必须支持：

- 简体中文
- English

实现规则：

- UI 文案使用翻译 key，不内联硬编码。
- 将选中的语言持久化到本地应用设置。
- 使用稳定状态 key，例如 `same`、`drift`、`broken`、`missing`、`unknown`、`shared`、`not-targeted`；显示文本单独翻译。
- 同时测试中英文长文本。
- 不翻译文件系统路径、命令名、JSON 字段名和 routine 标识符。

## 跨平台界面要求

应用必须支持 Windows、macOS 和 Linux。

| 区域 | 要求 |
| --- | --- |
| 窗口标题栏 | 除非确有必要，否则使用原生窗口行为。 |
| 菜单 | 提供符合平台习惯的应用、编辑、视图和帮助菜单。 |
| 快捷键 | Windows/Linux 使用 `Ctrl`，macOS 使用 `Cmd`。 |
| 路径 | 展示原生路径，但内部使用规范化结构值存储。 |
| Shell | Windows 优先 PowerShell，macOS/Linux 优先 Bash。 |
| 文件对话框 | 从 main process 使用原生对话框。 |
| 字体 | 使用系统 UI 字体栈。 |

UI 应采用主流生产力工具风格：紧凑导航、克制表面、清晰表格、可预期表单、可见校验，不做装饰性 AI 品牌感。

## 推荐 UI 结构

使用以下导航模型：

- Dashboard
- Inventory
- Install Matrix
- Projects
- Policy
- Distribute
- Validation
- Task Center
- Docs
- Settings

Install Matrix 是主要工作视图。Distribute Wizard 是安全写入路径。Dashboard 只是摘要页，不是营销落地页。

详细前端布局和交互契约维护在 [Electron 应用 UI 设计图](electron-app-ui-design.zh-CN.md)。正式实现时，应先遵循该文档，再补充具体 route UI。

## 插件与 Skill 安装说明

Codex 插件属于操作者环境能力。应安装在 Codex 用户级环境中，不安装到本仓库。本仓库应保存执行规范、应用代码、测试和可分发的 Agent Routines，而不是用户特定插件状态。

完整可复用设置清单维护在 [Electron 应用提前安装和准备清单](electron-app-prerequisites.zh-CN.md)。

建议用户级安装的插件：

| 插件或能力 | 用途 | 范围 |
| --- | --- | --- |
| Build Web Apps | renderer UI 实现、前端测试指导、使用 React 时的性能模式。 | 用户级 |
| Browser | 打开并检查本地 renderer/dev-server 目标，做 UI QA。 | 用户级 |
| Chrome | 当测试需要用户现有 Chrome profile 时作为可选 fallback。 | 用户级 |
| GitHub | 发布应用工作时可选，用于 PR、issue 和 CI 检查。 | 用户级 |
| Codex Security | 可选，用于审查 Electron IPC、命令执行和打包变更。 | 用户级 |
| imagegen | UI 概念图和界面预览图。 | 用户级 |
| playwright | Browser 不可用时，用于 renderer 交互测试和截图。 | 用户级 |

本仓库已经维护的项目级源指导：

| 补充项 | 用途 | 范围 |
| --- | --- | --- |
| 本执行规范 | 所有 agent 和维护者共享的实现契约。 | 项目 |
| `docs/electron-app-ui-design.zh-CN.md` | 前端布局、视觉 tokens、界面线框和交互规则。 | 项目 |
| `docs/electron-app-prerequisites.zh-CN.md` | 机器设置、插件范围、依赖安装和验证清单。 | 项目 |
| `skills/electron-app-builder` | 安全 Electron main/preload/renderer 实现的 agent 指令。 | 源 Skill，然后安装到目标 |
| `skills/desktop-design-system` | 桌面生产力 UI、主题 tokens、密集表格和视觉 QA 指导。 | 源 Skill，然后安装到目标 |
| `skills/desktop-qa` | Renderer、原生行为、截图、主题、语言和任务日志 QA 指导。 | 源 Skill，然后安装到目标 |
| `skills/desktop-packaging-release` | Electron 打包、签名边界、dry-run 产物和发布就绪度。 | 源 Skill，然后安装到目标 |
| `skills/i18n-checklist` | 英文和简体中文翻译 key 与语言切换 QA。 | 源 Skill，然后安装到目标 |

可选未来补充：

| 补充项 | 建议处理方式 |
| --- | --- |
| Figma connector | 如引入设计稿，可作为可选用户级 connector。 |
| 架构决策记录 | 当决策改变安全、打包、命令执行或分发行为时，添加项目文档。 |
| CI 桌面任务矩阵 | 只有在本地 app 已有稳定 build 和 renderer test scripts 后再添加。 |

安装规则：

- 扩展 Codex 自身能力的插件安装到用户级。
- 仓库特定的指令、检查清单和应用代码放在项目内。
- 只有当某个项目级 Skill 对多个仓库都有复用价值时，才提升为用户级安装。

建议安装流程：

1. 从 Codex 插件安装 UI 或组织批准的插件分发路径安装用户级 Codex 插件。不要把插件缓存目录复制进本仓库。
2. 只启用当前任务需要的插件。实现阶段先启用 Build Web Apps 和 Browser。只有需要 PR 或 CI 工作时才启用 GitHub。做安全审查时再启用 Codex Security。
3. 项目专用指导先放在 `docs/` 或项目级 Skill 中，直到它已经在多个仓库中复用。
4. 如果某个线程需要通过 Codex 安装插件，应先列出可安装候选项，只在插件或 connector 精确匹配时请求安装。
5. 安装或启用插件后，在依赖插件生成的变更前先运行仓库验证门禁。

## 实现阶段

后续 agent 应按以下阶段实现应用；每个阶段只有在退出条件通过后才能收尾：

| 阶段 | 范围 | 退出条件 |
| --- | --- | --- |
| 0. Scaffold | Vite、Electron main/preload/renderer 入口、TypeScript config、app scripts、空壳 UI。 | 应用可本地启动，`typecheck`、`lint` 和 `test` scripts 存在且可运行。 |
| 1. 只读模型 | Settings、inventory scan、install matrix scan、diagnostics、docs view，不执行写命令。 | Renderer 展示真实源 Skills/workflows 和 diagnostics，不执行写入。 |
| 2. 计划与校验 | Config open/validate、dry-run 计划生成、仓库门禁、命令输出查看器。 | Dry-run plan 和 validation gates 通过白名单 IPC 与任务日志运行。 |
| 3. 受控写入 | Manifest write、merge apply、replace-listed、sync-prune 确认、单任务队列、取消、archive writer。 | 写入路径需要确认，并产出可审阅任务证据。 |
| 4. 产品界面 | Install Matrix 作为主视图、Distribute Wizard、主题 tokens、i18n、平台菜单、快捷键。 | 英文和简体中文可不重启切换；浅色、深色和随系统主题已检查。 |
| 5. 发布就绪 | 目录打包 dry-run、产物排除检查、安全 review、跨平台 QA notes。 | 未经明确批准不签名、不发布；发布风险已记录。 |

## 测试与验证契约

实现期间，在 `apps/agent-routines-manager` 中运行应用级检查：

```powershell
npm run check:deps
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
```

```bash
npm run check:deps
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
```

只有在所需 browser runtime 已安装后才运行 `npm run test:ui`。如果 `npm audit` 或 browser 安装因为网络、registry 访问失败而失败，应分类为外部阻塞，而不是证明仓库实现错误。

声明 Electron app 实现完成前，还必须运行 `AGENTS.md` 中的完整仓库验证门禁。打包检查应从 `npm run package` 的目录输出开始；签名、notarization、上传、tag、发布和版本修改都需要明确人工确认。

## 验收标准

实现完成前必须满足：

- 浅色、深色和随系统主题均已实现并完成视觉检查。
- 简体中文和英文可以不重启切换。
- Windows、macOS 和 Linux 的命令选择已由测试或明确 QA 记录覆盖。
- 源码布局契约已在 `apps/agent-routines-manager` 下实现。
- 必需 npm scripts 存在并通过，或已用精确 blocker 记录平台特定失败。
- renderer 不能执行任意命令。
- IPC 为白名单且参数已校验。
- 计划生成默认保持 dry-run。
- Merge、replace-listed、sync-prune 都需要明确确认。
- 写命令经过单任务队列执行，并在安全可行时支持日志流和取消。
- Manifest 写入、distribution apply 和 archive 写入会产出持久可审阅证据。
- 仓库完整验证门禁通过。
- UI 截图覆盖 dashboard、install matrix、distribute wizard、validation、task center、settings、浅色主题和深色主题。
