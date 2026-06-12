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

PowerShell manifest 入口使用 `-ManifestPath <path>`。Bash manifest 入口使用 `--manifest-path PATH`，并需要 `python3`、`python`、`node` 或 `jq` 中至少一个 JSON 解析器。Manifest 中的相对项目路径按源仓库根目录解析。`-Force` 和 `--force` 会替换已经存在的列名目标目录。

## 更新策略

从源仓库更新，重新运行校验器，然后只在审阅差异后使用 `--force` 或 `-Force` 重新安装。不要将已安装目录视为事实来源。

## 卸载策略

除非只移除 workflows，否则卸载器需要明确的 Skill 名称。它们默认绝不移除所有 Skills，也绝不在未明确请求时移除 workflows。
