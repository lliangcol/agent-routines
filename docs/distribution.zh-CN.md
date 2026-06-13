# 分发

## 用户级路径

- Codex Windows：`%USERPROFILE%\.codex\skills`
- Codex macOS/Linux：`$HOME/.codex/skills`
- Claude Code Windows：`%USERPROFILE%\.claude\skills`
- Claude Code macOS/Linux：`$HOME/.claude/skills`
- Workflow Windows：`%USERPROFILE%\.agent-routines\workflows`
- Workflow macOS/Linux：`$HOME/.agent-routines/workflows`

## 项目级路径

- Codex 项目：`<repo>/.codex/skills`
- Claude Code 项目：`<repo>/.claude/skills`
- Workflow 项目：`<repo>/.agent-routines/workflows`

## 选择范围

对跨仓库适用的个人例行流程使用用户级安装。当某个仓库需要固定行为、可审阅的 Skill 内容或团队特定 workflow 版本时，使用项目级安装。

当一个经过审阅的文件需要同时决定用户级和项目级安装范围时，使用 manifest 安装。Manifest 模式是增量复制：它只复制列出的 Skill 和 workflow 目录，绝不移除未列入 manifest 的已安装内容。

```json
{
  "version": 1,
  "user": {
    "codex": {
      "skills": ["guarded-change"],
      "workflows": ["preflight"]
    }
  },
  "projects": [
    {
      "path": "C:\\path\\to\\repo",
      "claudeCode": {
        "skills": ["pay-docs"],
        "workflows": ["doc-check"]
      }
    }
  ]
}
```

PowerShell manifest 入口使用 `-ManifestPath <path>`。Bash manifest 入口使用 `--manifest-path PATH`，并需要 `python3`、`python`、`node` 或 `jq` 中至少一个 JSON 解析器。Manifest 中的相对项目路径按源仓库根目录解析。`-Force` 和 `--force` 会替换清单中已存在的目标目录。`-WhatIf` 和 `--dry-run` 只报告计划安装和替换的目标，不创建目录、不复制文件、不删除文件，也不替换已有目标。Manifest 模式应使用专用的 `install-manifest` 入口，而不是 user 或 project 安装器。

默认示例 manifest 只在用户级安装广泛可复用的 Skills，项目级条目只保留通用 workflow runtime 目录。仓库专属的 Skills（如特定项目的支付、数据库或 agent 投影）应留在对应项目中，除非被明确提升为通用能力。

对于已经分散存在大量用户级和项目级安装的机器，应使用安装发现能力从显式项目根目录生成经过审阅的 manifest 计划，而不是手工改正式分发 manifest。见[安装发现](install-discovery.zh-CN.md)。

## 更新策略

从源仓库更新，重新运行校验器，然后先运行 dry-run（`-WhatIf` 或 `--dry-run`），再在审阅差异后使用 `--force` 或 `-Force` 重新安装。不要将已安装目录视为事实来源。

## 卸载策略

除非只移除 workflows，否则卸载器需要明确的 Skill 名称。它们默认绝不移除所有 Skills，也绝不在未明确请求时移除 workflows。
