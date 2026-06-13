# 安装发现

安装发现会基于经过审阅的配置文件和当前本机安装状态生成安装 manifest。它适用于一台机器上跨多个仓库使用 Agent Routines，并且希望先得到一个可审计计划再安装的场景。

生成器默认保守：

- 不扫描全盘。
- 只扫描用户级目标和配置中列出的项目根目录。
- 只有传入 `-WriteManifest` 或 `--write-manifest` 才写文件。
- 只有同时传入 `-Apply` 或 `--apply` 才执行安装。
- 对源仓库中不存在的已安装目录只报告，不加入 manifest，也不删除。

## 配置

从 `tools/install-discovery.config.example.json` 复制一份经过审阅的配置，不要直接写入正式分发 manifest，例如：

```text
.agent-routines/install-discovery.config.json
```

关键字段：

| 字段 | 作用 |
| --- | --- |
| `projectRoots` | 显式声明要扫描的 Git 项目根目录，例如 `D:\Work\Projects` 和 `D:\Repositories`。 |
| `tools` | 要生成的工具 section：`codex`、`claudeCode` 或两者。 |
| `projectDiscovery.maxDepth` | 每个项目根目录下的最大扫描深度。 |
| `projectDiscovery.excludeDirs` | 发现项目时跳过的目录名。除非你有意治理临时目录中的仓库，否则应包含 `.tmp`、`.cache`、`tmp`、`temp` 等名称。 |
| `projectDiscovery.skipNestedRepos` | 为 `true` 时，发现 Git 仓库后不再继续扫描其下级目录；这是大型项目根目录更安全的默认值。 |
| `scopePolicy.userLevelSkills` | 应生成到 `user.<tool>.skills` 的 Skills。 |
| `scopePolicy.projectLevelOnlySkills` | 不允许提升到用户级的 Skills；若发现用户级安装，会报告 conflict。 |
| `scopePolicy.userLevelWorkflows` | 生成到用户级的 workflows。 |
| `scopePolicy.projectDefaultWorkflows` | 已存在项目级 Agent Routines 目标的项目会补充这些 workflows。 |
| `output.manifestPath` | 生成 manifest 的路径，相对路径按源仓库根目录解析。 |
| `output.reportPath` | 生成计划报告的路径，相对路径按源仓库根目录解析。 |

不要在配置文件中放 `apply`。`install.force` 只能保留为 `false`；替换目标必须由 CLI 参数显式触发。安装和替换都必须显式执行，避免已提交配置静默修改本机环境。

## 命令

只校验配置结构，不扫描、不安装：

```powershell
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tests/validate-install-discovery-config.sh --config-path ./.agent-routines/install-discovery.config.json
```

只生成 dry-run 计划：

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json
```

写入 manifest 和计划，并校验 manifest：

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -WriteManifest
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --write-manifest
```

写入、校验、安装并执行安装后检查：

```powershell
.\tools\generate-install-manifest.ps1 -ConfigPath .\.agent-routines\install-discovery.config.json -WriteManifest -Apply
```

```bash
./tools/generate-install-manifest.sh --config-path ./.agent-routines/install-discovery.config.json --write-manifest --apply
```

只有在审阅计划后才使用 `-Force` 或 `--force`。Force 替换会透传给现有 manifest 安装器。

## Scope 推断

Policy 是期望 scope 的事实来源。已安装状态只作为证据和迁移输入。

| 证据 | 结果 |
| --- | --- |
| Skill 出现在 `userLevelSkills` 中，且存在于 `skills/` | 加入每个选中工具的用户级 skill block。 |
| Skill 出现在 `projectLevelOnlySkills` 中 | 永不加入用户级 block。 |
| 项目级已安装 Skill，且存在于 `skills/` | 加入对应项目和工具 block。 |
| 已安装 Skill 或 workflow 不存在于当前源仓库 | 报告为 `unknownInstalledItems`，不加入 manifest。 |
| 用户级已安装 Skill 或 workflow 不在对应用户级 policy 中 | 报告为 `unclassifiedInstalledItems`，不加入 manifest。 |
| 项目已经有 `.codex`、`.claude` 或 `.agent-routines` 目标 | 加入已有项目 workflows，并补充配置的 `projectDefaultWorkflows`。 |

workflow 运行时目录在 Codex 和 Claude Code 之间共享。为了避免向同一个目标重复复制，生成的用户级和项目级 workflow 数组只放到配置中第一个工具下。Skills 仍按工具分别生成。

## 输出

计划 JSON 包含：

- `discoveredProjects`
- `scannedUserTargets`
- `scannedProjectTargets`
- `generatedManifest`
- `unknownInstalledItems`
- `unclassifiedInstalledItems`
- `missingPolicyItems`
- `conflicts`
- `skippedProjects`
- `installPlan`
- `commandsToRun`

执行安装前，应先审阅 conflicts 和 unknown items。
