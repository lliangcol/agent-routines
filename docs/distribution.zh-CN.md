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

当一个经过审阅的文件需要为一组已知仓库同时决定用户级和项目级安装范围时，使用静态 distribution manifest。仓库内置的静态 manifest 仍是 `version: 1`，普通 `merge` 安装刻意保持增量语义：只复制列出的 Skill 和 workflow 目录，不移除未列入 manifest 的已安装内容。

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

PowerShell manifest 入口使用 `-ManifestPath <path>`。Bash manifest 入口使用 `--manifest-path PATH`，并需要 `python3`、`python`、`node` 或 `jq` 中至少一个 JSON 解析器。Manifest 中的相对项目路径按源仓库根目录解析。优先使用 PowerShell 的 `-Mode merge`、`-Mode replace-listed`、`-Mode dry-run`，或 Bash 的 `--mode merge`、`--mode replace-listed`、`--mode dry-run`。`-Force` 和 `--force` 只是 `replace-listed` 的兼容 shim，不是独立分发策略。Manifest 模式应使用专用的 `install-manifest` 入口，而不是 user 或 project 安装器。

默认示例 manifest 只在用户级安装广泛可复用的 Skills，项目级条目只保留通用 workflow runtime 目录。仓库专属的 Skills（如特定项目的支付、数据库或 agent 投影）应留在对应项目中，除非被明确提升为通用能力。

对于已经分散存在大量用户级和项目级安装的机器，应使用 install discovery config v2 从显式项目根目录生成经过审阅的 desired-state plan，而不是手工改正式分发 manifest。生成的 v2 manifest 包含 `desiredTargets[]`、`actions[]`、`backupPlan`、`restorePlan`、unknown/unclassified report-only items 和动作摘要。见[安装发现](install-discovery.zh-CN.md)。

## 更新策略

从源仓库更新，重新运行校验器，然后先运行 dry-run（`-WhatIf`、`--dry-run` 或 `--mode dry-run`），再在审阅差异后替换列出的目标。不要将已安装目录视为事实来源。

## 卸载策略

除非只移除 workflows，否则卸载器需要明确的 Skill 名称。它们默认绝不移除所有 Skills，也绝不在未明确请求时移除 workflows。
