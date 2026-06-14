# Electron App 安装实战教程

本文档说明如何用 Agent Routines Manager Electron App 审阅并安装 Agent Routines。它使用 `D:\Repositories` 作为受控示例范围，并给出 `D:\Repositories\agent-routines` 的专项安装集合。实际 Apply 必须以当前 v2 config、生成的 manifest 和 action table 为准。

本文只描述受控安装流程。没有明确人工确认时，不执行 `Apply`、`replace-listed` 或 `sync-prune`，不修改用户级安装目标，也不修改项目级安装目标。

## 示例审阅摘要

执行环境：

| 项 | 值 |
| --- | --- |
| 源仓库 | `D:\Repositories\agent-routines` |
| 项目根 | `D:\Repositories` |
| 发现项目 | `D:\Repositories\agent-config`, `D:\Repositories\agent-dive`, `D:\Repositories\agent-routines`, `D:\Repositories\computer-use` |
| 源清单 | 24 个 Skills，17 个 workflows |
| 执行方式 | PowerShell 只读校验和 dry-run 计划 |
| 写入状态 | 未写 manifest，未 Apply |

实际运行的等价命令：

```powershell
.\tests\validate-install-discovery-config.ps1 -ConfigPath $env:TEMP\agent-routines.d-repositories.install-discovery.config.json
.\tools\generate-install-manifest.ps1 -ConfigPath $env:TEMP\agent-routines.d-repositories.install-discovery.config.json
```

结果摘要：

| 检查项 | 结果 |
| --- | --- |
| config 校验 | `validate-install-discovery-config: ok` |
| discoveredProjects | 由 `discovery.roots` 和 `maxDepth` 生成。 |
| desiredTargets | 用户目标、项目默认和显式 `projectTargets[]`。 |
| actions | `install`、`skip`、`replace` 或 `prune-candidate`。 |
| unknownInstalledItems | 源仓库外安装项；只报告。 |
| unclassifiedInstalledItems | 找不到已知 routine source 的已安装项；只报告。 |
| backupPlan / restorePlan | `replace-listed` 或 `sync-prune` 前必须存在。 |

Unknown 和 unclassified installed items 永远只报告。除非已审阅的 v2 desired target 明确命名对应 routine，发现工具不会删除、迁移或加入 manifest。

项目目标目录创建由 `projectDefaults.createTargets` 和每个 `projectTargets[].createTargets` 控制。当 `createTargets` 为 `false` 时，planner 只报告缺失的项目目标 root，不会创建目录；为 `true` 时，生成的 actions 仍需要审阅后才能 Apply。

## Electron App 操作路径

1. 启动应用。

   开发模式：

   ```powershell
   Set-Location D:\Repositories\agent-routines\apps\agent-routines-manager
   npm run dev
   ```

   已打包应用则直接打开 Agent Routines Manager。

2. 在 Settings 中确认：

   | 字段 | 值 |
   | --- | --- |
   | Source repository | `D:\Repositories\agent-routines` |
   | Active config | 建议使用 `.tmp\install-discovery.d-repositories.json` |

   不建议把本机 config 存到 `tools\` 后提交。`.tmp\` 已被仓库忽略，适合保存本机审阅配置。

3. 在 Projects 中设置：

   | 字段 | 值 |
   | --- | --- |
   | Root path | `D:\Repositories` |
   | Depth | `4` |
   | Nested repos | `skip` |
   | Excluded directories | `.git`, `node_modules`, `vendor`, `dist`, `build`, `target`, `.tmp`, `.cache`, `tmp`, `temp`, `.agent-routines`, `.codex`, `.claude` |

   删除不属于本次范围的 `D:\Work\Projects`。

4. 在 Policy 中设置下面的用户级和项目级策略。

5. 点击 Save config as，保存到：

   ```text
   .tmp\install-discovery.d-repositories.json
   ```

6. 点击 Validate config。

   期望结果是 `config valid`。如果出现 duplicate 或 missing source，先修正 Policy 中的名称。

7. 进入 Distribute，依次审阅选择范围、选择内容、审阅目标、应用模式、执行与验证、结果。

8. 点击 Generate dry-run plan。

   该步骤只运行安装发现器，不写文件。

9. 审阅 Plan JSON。

   Plan JSON 是只读的。如果 desired state 不正确，应修改并保存 config 后重新生成 plan。

10. 只有在人工确认要写入时，才点击 Write manifest。

11. 只有在人工确认要安装时，才在 Apply 步骤输入：

   ```text
   APPLY
   ```

   然后点击 Apply。

12. 只有审阅到需要替换已有目标时，才选择 `replace-listed` 并输入：

   ```text
   REPLACE <N> TARGETS
   ```

   替换前会先备份目标。若要同步删除，选择 `sync-prune` 并输入 `SYNC PRUNE <N> TARGETS`。

## 推荐 config

在 Electron App 中保存的 config 应等价于：

```json
{
  "version": 2,
  "userTargets": {
    "enabled": true,
    "tools": ["codex", "claudeCode"],
    "skills": {
      "codex": ["guarded-change", "review-loop"],
      "claudeCode": ["guarded-change", "review-loop"]
    },
    "workflows": ["preflight", "gate-check"]
  },
  "projectDefaults": {
    "enabled": true,
    "tools": ["codex", "claudeCode"],
    "skills": { "codex": [], "claudeCode": [] },
    "workflows": ["preflight", "gate-check"],
    "createTargets": false,
    "mode": "merge"
  },
  "projectTargets": [
    {
      "path": "D:\\Repositories\\agent-routines",
      "enabled": true,
      "tools": ["codex", "claudeCode"],
      "skills": {
        "codex": ["electron-app-builder"],
        "claudeCode": ["electron-app-builder"]
      },
      "workflows": ["preflight", "gate-check"],
      "createTargets": false,
      "mode": "merge"
    }
  ],
  "discovery": {
    "roots": ["D:\\Repositories"],
    "maxDepth": 4,
    "excludeDirs": [".git", "node_modules", ".agent-routines", ".codex", ".claude"],
    "skipNestedRepos": true
  },
  "promotionRules": {
    "doNotPromoteToUserSkills": ["pay-docs", "dms-repair", "api-sync"]
  },
  "output": {
    "manifestPath": ".tmp/generated/d-repositories.install.manifest.json",
    "reportPath": ".tmp/generated/d-repositories.install.plan.json"
  },
  "applySafety": {
    "unknownInstalledItems": "report-only"
  }
}
```

## 用户级安装集合

用户级集合放到 Codex 和 Claude Code 的用户级 Skills 目标。workflow runtime 是共享目标，manifest 里只需要由 primary workflow tool 承载一次。

### 用户级 Skills

| Skill | 放到用户级的原因 |
| --- | --- |
| `guarded-change` | 所有仓库都需要安全变更边界、确认点和回退规则。 |
| `review-loop` | 适合跨仓库代码审查、修复、复审闭环。 |
| `merge-fix` | Git 仓库通用的冲突处理能力。 |
| `env-audit` | 本机 shell、PATH、运行时和 agent 环境检查是跨仓库能力。 |
| `runtime-repair` | 运行时缺口修复通常是机器或用户环境问题。 |
| `commit-guard` | 提交前检查、身份、diff、branch 状态适用于所有仓库。 |
| `prompt-qa` | 适合审阅 AGENTS、CLAUDE、任务提示词和执行契约。 |
| `release-guard` | 发布前风险识别是跨仓库复用能力。 |
| `security-review` | secret、私有路径、敏感输出风险适用于所有仓库。 |
| `github-guard` | GitHub Actions、PR、branch protection 检查是跨仓库能力。 |
| `graph-audit` | 有 codebase-memory 或图谱说明的仓库可复用同一能力；无图谱时降级为证据化报告。 |

### 用户级 workflows

| Workflow | 用途 |
| --- | --- |
| `preflight` | 收集仓库路径、branch、HEAD、dirty state 和规则文件信号。 |
| `gate-check` | 运行通用只读门禁和显式安全自定义命令。 |
| `merge-check` | 检查 merge 状态、冲突文件和 conflict markers。 |
| `runtime-check` | 检查 shell、PATH、运行时和 agent runtime readiness。 |
| `commit-check` | 检查 commit readiness、diff whitespace、staged/untracked 状态。 |
| `release-check` | 检查 release readiness，不 publish、不 tag、不 push。 |
| `security-check` | 本地高置信 secret-like 和私有路径信号扫描。 |
| `github-check` | 本地 GitHub Actions workflow 文件和候选 required checks 检查。 |
| `graph-check` | 图谱和 MCP readiness 本地检查，不注册 MCP、不索引仓库。 |

不放入用户级的源 Skills：

| Skill | 原因 |
| --- | --- |
| `pay-docs` | 只适合支付、订阅、配置文档场景。 |
| `dms-repair` | 数据库修复必须项目和环境强绑定。 |
| `api-sync` | API、DTO、enum 同步需要绑定具体仓库的前后端契约。 |
| `node-workspace-release` | Node workspace 发布流程需要绑定具体 package manager、lockfile 和 release surface。 |
| `electron-app-builder`, `desktop-*`, `i18n-checklist` | 只在 Electron 桌面应用仓库中需要。 |
| `archive-record`, `knowledge-drift`, `governance-audit` | 可以跨仓库使用，但更适合作为项目级专项能力，避免把所有审计/归档模式提升为默认用户能力。 |
| `java-maven-verify`, `db-read`, `maven-check`, `startup-check` 对应能力 | 已审阅的 `D:\Repositories` 快照没有共同 Java Maven、数据库修复或 Windows startup 项目场景。 |

## D:\Repositories 审阅快照

| 项目 | 当前证据 | 项目级最小集合 | 可选专项集合 |
| --- | --- | --- | --- |
| `agent-config` | Python `pyproject.toml`，AGENTS 要求 audit-only，不执行真实 install、login、plugin、MCP 注册。 | 项目级 Skills：无。项目级 workflows：`preflight`, `gate-check`, `governance-check`。 | 需要发布或公开前审查时用用户级 `release-guard`, `security-review`；可加项目级 `security-check`, `release-check`。 |
| `agent-dive` | 中文文档和学习资料仓库，AGENTS 要求中文、真实证据、codebase-memory 优先。 | 项目级 Skills：无。项目级 workflows：`preflight`, `gate-check`, `governance-check`。 | 常做知识漂移时加 `knowledge-drift`、`doc-check`、`drift-check`、`graph-check`。 |
| `agent-routines` | Agent Routines 源仓库，包含 Skills、workflows、安装适配器、Electron App、双语 docs、验证门禁。 | 项目级 Skills：无。项目级 workflows：`preflight`, `gate-check`, `governance-check`。v2 项目默认可表达这一组。 | 见下文专项安装集合。 |
| `computer-use` | 本地 computer-control 执行记录、runbooks、evidence，README 要求 archive validation。 | 项目级 Skills：无。项目级 workflows：`preflight`, `gate-check`, `governance-check`。 | 常维护执行归档时加 `archive-record`, `archive-check`；Windows startup 记录可按需用 `startup-check`。 |

## D:\Repositories 最小安装集合

跨已审阅项目取最小集合时，原则是：

1. 能跨仓库复用的判断能力安装到用户级。
2. 项目级只安装每个仓库都需要、且不引入领域假设的 workflow runtime。
3. 不把支付、数据库、Maven、Electron、Node 发布等领域能力装进所有项目。

最小集合：

| Scope | Skills | Workflows |
| --- | --- | --- |
| User Codex | `guarded-change`, `review-loop`, `merge-fix`, `env-audit`, `runtime-repair`, `commit-guard`, `prompt-qa`, `release-guard`, `security-review`, `github-guard`, `graph-audit` | `preflight`, `gate-check`, `merge-check`, `runtime-check`, `commit-check`, `release-check`, `security-check`, `github-check`, `graph-check` |
| User Claude Code | 同 User Codex Skills | 不重复复制；共享 workflow runtime 已由 primary workflow tool 承载 |
| 已审阅 root 的项目默认 | 无项目级 Skills | `preflight`, `gate-check`, `governance-check` |

项目默认只应用到已审阅 v2 config 中的 desired project targets。若要只配置某个仓库，把它加入 `projectTargets[]`，或在 Projects 页面使用“只保留这个项目”。`createTargets: false` 会让缺失项目目标 root 保持 report-only；`createTargets: true` 可以在审阅后创建这些 root。

## agent-routines 专项安装集合

### 选中项目覆盖

如果后续要把 `agent-routines` 作为 Electron App 和 routines 源仓库长期维护，应把下面集合作为 `D:\Repositories\agent-routines` 的 `projectTargets[]` 覆盖来表达。不要手工编辑 Plan JSON；Write manifest 和 Apply 的来源是保存的 v2 config 与生成的 manifest。

项目级 Skills：

| Skill | 原因 |
| --- | --- |
| `electron-app-builder` | Electron main/preload/renderer、IPC allowlist、命令执行边界。 |
| `desktop-design-system` | Agent Routines Manager 的桌面控制台视觉和交互规则。 |
| `desktop-qa` | Electron UI、窗口行为、任务日志、截图和平台差异 QA。 |
| `desktop-packaging-release` | Electron Builder、签名边界、目录打包和发布风险。 |
| `i18n-checklist` | 英文和简体中文 UI、本地化 key、文本长度和语言切换。 |
| `api-sync` | main/preload/renderer API、DTO、schema、enum 同步。 |
| `node-workspace-release` | `apps/agent-routines-manager` 的 npm workspace、lockfile 和发布 dry-run。 |
| `archive-record` | `executions/YYYY/MM/...` 归档、证据和 artifact 布局。 |
| `knowledge-drift` | docs、catalog、examples、执行记录和源目录之间的漂移检查。 |
| `governance-audit` | AGENTS、验证门禁、安装策略和当前证据权威性审计。 |

项目级 workflows：

| Workflow | 原因 |
| --- | --- |
| `preflight` | 所有专项任务前的仓库状态证据。 |
| `gate-check` | 安全自定义门禁和 diff 检查。 |
| `governance-check` | 当前治理文件、agent 目录、验证脚本和 git 状态。 |
| `node-workspace-check` | Electron App package metadata、lockfile 和 npm scripts。 |
| `runtime-check` | PowerShell、Bash、Python、Node、npm、agent runtime readiness。 |
| `security-check` | IPC、发布、docs 和本地路径风险的本地扫描。 |
| `release-check` | changelog、license、security notes、release tooling。 |
| `doc-check` | 双语 docs、catalog、examples 和自定义文档检查。 |
| `archive-check` | durable execution archive 布局验证。 |
| `drift-check` | 知识根、drift metadata 和本地 drift 工具可用性。 |
| `github-check` | GitHub Actions workflow 和 required check 候选项。 |
| `graph-check` | codebase-memory MCP readiness 和 graph-first 指令检查。 |
| `commit-check` | 提交前 branch、identity、diff whitespace、staged 状态。 |
| `merge-check` | merge 状态和冲突标记检查。 |

不要在 Plan JSON 中手工加入这些专项项目项。当前 App 的 Plan JSON 视图是只读的；Write manifest 和 Apply 的来源是保存的 config 与生成的 manifest。

## Apply 前检查清单

在 Electron App 点击 Apply 前，逐项确认：

| 检查 | 通过标准 |
| --- | --- |
| Source repository | 是 `D:\Repositories\agent-routines`。 |
| Active config | 是本次审阅过的 `.tmp\install-discovery.d-repositories.json`。 |
| Projects root | 只有 `D:\Repositories`，没有误包含其它 root。 |
| Policy | 用户默认、项目默认和项目覆盖与已审阅 v2 config 一致。 |
| Dry-run plan | action table 中只有已审阅的 `install`、`skip`、`replace` 或 `prune-candidate` 条目。 |
| Unknown installed items | 源仓库外或无法分类的安装项保持 report-only，不参与 apply。 |
| Generated projects | 项目目标与已审阅的 `projectTargets[]` 和 discovered projects 一致。 |
| Confirmation | `merge` 输入 `APPLY`；`replace-listed` 输入 `REPLACE <N> TARGETS`；`sync-prune` 输入 `SYNC PRUNE <N> TARGETS`。 |

## 安装后验证

Apply 成功后，在 Electron App 中执行：

1. Install Matrix -> Refresh scan。
2. Distribute 或 Task Center -> Check install target。
3. Validation -> Run all readonly。

等价命令：

```powershell
.\adapters\codex\check-user.ps1
.\adapters\claude-code\check-user.ps1
.\adapters\codex\check-project.ps1 -ProjectPath D:\Repositories\agent-routines
.\adapters\claude-code\check-project.ps1 -ProjectPath D:\Repositories\agent-routines
```

仓库门禁：

```powershell
.\tests\validate-structure.ps1
.\tests\validate-skills.ps1
.\tests\validate-workflows.ps1
.\tests\validate-docs.ps1
.\tests\validate-changelog.ps1
.\tests\validate-manifest.ps1 -ManifestPath .\distribution\agent-routines.manifest.json
.\tests\validate-install-discovery-config.ps1 -ConfigPath .\tools\install-discovery.config.example.json
.\tests\run-workflows.ps1
```

如果使用 Bash 环境，也运行对应 `.sh` 门禁。PowerShell 和 Bash 结果必须都通过后，才能把安装流程称为完成。
