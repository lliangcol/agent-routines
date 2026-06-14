# 安装发现

安装发现会基于源仓库和本机当前安装状态生成经过审阅的 desired state 与安装 manifest。它适用于需要把 Agent Routines 分发到用户级工具目录和多个项目仓库的机器。

生成器默认保守：

- 不扫描全盘。
- 只扫描配置中的用户级目标和 discovery roots。
- 只有传入 `-WriteManifest` 或 `--write-manifest` 才写文件。
- 只有同时传入 `-Apply` 或 `--apply` 才执行安装。
- unknown 和 unclassified installed items 永远 report-only。

## Config v2

从 `tools/install-discovery.config.example.json` 复制一份经过审阅的配置，例如：

```text
.agent-routines/install-discovery.config.json
```

如果需要按项目类型选择起点，可使用[Install Discovery Manifest 模板](install-discovery-manifest-templates.zh-CN.md)中的脱敏模板。

关键字段：

| 字段 | 作用 |
| --- | --- |
| `version` | 当前 desired-state 模型使用 `2`。 |
| `userTargets.enabled` | 启用或禁用用户级 desired targets。 |
| `userTargets.tools` | 用户级工具：`codex`、`claudeCode` 或两者。 |
| `userTargets.skills.<tool>` | 安装到对应工具用户目录的 Skills。 |
| `userTargets.workflows` | 安装到共享用户 runtime 的 workflows。 |
| `projectDefaults` | discovered projects 的默认 desired state。 |
| `projectTargets[]` | 显式项目级 desired state 和覆盖项。 |
| `projectTargets[].createTargets` | generator 是否可以创建缺失的项目目标目录。 |
| `projectTargets[].mode` | 项目级非破坏 desired-state planning 模式。 |
| `discovery.roots` | 用于扫描 Git 仓库的已审阅 roots。 |
| `discovery.maxDepth` | 每个 root 下的最大扫描深度。 |
| `discovery.excludeDirs` | discovery 时跳过的目录名。 |
| `discovery.skipNestedRepos` | 为 `true` 时，发现 Git 仓库后停止继续向下遍历。 |
| `promotionRules.doNotPromoteToUserSkills` | 不允许安装到用户级的 Skills。这不是项目安装列表。 |
| `output.manifestPath` | 生成 manifest 的路径，相对路径按源仓库根目录解析。 |
| `output.reportPath` | 生成计划报告的路径，相对路径按源仓库根目录解析。 |
| `applySafety.unknownInstalledItems` | 必须是 `report-only`。 |

Config v2 不能包含 `force`、`pruneUnlisted`、`defaultMode` 或破坏性 apply 开关。破坏性行为只能来自本次 UI 或 CLI 请求。

## v1 兼容

v1 config 可作为迁移输入：

- `projectRoots` 迁移为 `discovery.roots`。
- `projectDiscovery` 迁移为 `discovery`。
- `scopePolicy.userLevelSkills` 迁移为 `userTargets.skills`。
- `scopePolicy.userLevelWorkflows` 迁移为 `userTargets.workflows`。
- `scopePolicy.projectDefaultWorkflows` 迁移为 `projectDefaults.workflows`。
- `scopePolicy.projectLevelOnlySkills` 迁移为 `promotionRules.doNotPromoteToUserSkills`。

新文件应写成 v2。

## 命令

校验配置结构：

```powershell
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tests/validate-install-discovery-config.sh --config-path ./.agent-routines/install-discovery.config.json
```

生成 dry-run plan：

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -ApplyMode dry-run
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --mode dry-run
```

写入生成的 manifest 和 report：

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -WriteManifest -ApplyMode merge
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --write-manifest --mode merge
```

审阅后执行 Apply：

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -WriteManifest -Apply -ApplyMode merge
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --write-manifest --apply --mode merge
```

支持的 apply modes：

- `dry-run`：不写安装目标。
- `merge`：安装缺失项，已有目标跳过。
- `replace-listed`：先备份，再替换列出的 desired targets。
- `sync-prune`：先备份，再删除 desired state 外的受管已知 routine 目标。

`replace-listed` 和 `sync-prune` 必须来自明确的当前请求，并且生成 backup/restore plan。

## Manifest v2

生成的 manifest 包含：

- `desiredTargets[]`
- `actions[]`
- `backupPlan`
- `restorePlan`
- `unknownInstalledItems[]`
- `unclassifiedInstalledItems[]`
- `summary`

Action 只能是 `install`、`skip`、`replace` 或 `prune-candidate`。

Workflows 是共享 runtime targets。Skills 是 per-tool targets。当前 desired state 之外的矩阵单元显示 `not-targeted`；它们不是共享安装。

## Matrix 语义

Install Matrix 只聚合 desired targets。未选中的单元仍显示为 `not-targeted`，让操作者能把它们和缺失安装区分开。Project Detail Matrix 展开 routine x project x tool，并报告具体 project path、target path、action、changed files、missing files。

聚合严重度：

`broken > unknown > drift > missing > same > shared > not-targeted`

## 安全

- App 中展示的 Plan JSON 只读。
- config dirty、validation failed、digest mismatch、破坏性模式缺少 backup、确认短语错误时禁用 Apply。
- unknown 和 unclassified installed items 不会被自动 prune。
- 生成计划启用 `verifyAfterInstall` 时，Apply 会运行 check-install。execution archive 通过独立 archive task flow 写入。
