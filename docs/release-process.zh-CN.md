# 发布流程

本仓库将整个例行流程库作为一个整体进行版本管理。使用方通过 git tag 固定版本，并从该 checkout 安装。

## 版本策略

- 格式：`X.Y.Z`（CHANGELOG 标题），并有对应的 annotated git tag `vX.Y.Z`。
- 修复类变更（脚本行为修复、文档更正，不改变契约）递增 `Z`。
- 新增 skill、workflow、验证器或新的可选脚本参数递增 `Y`。
- 破坏性变更递增 `X`：移除或重命名 skill/workflow、修改 JSON 输出契约、修改安装器参数，或 manifest schema 版本升级。
- `distribution/agent-routines.manifest.json` 内的 `"version"` 字段是 manifest 的 schema 版本，不是库版本；只有 manifest 格式发生不兼容变化时才修改。

## 发布步骤

1. 确认 `main` 分支工作区干净。
2. 在 `CHANGELOG.md` 中新增 `X.Y.Z - YYYY-MM-DD` 小节，列出用户可见的变更。
3. 至少在一个 Bash 平台和一个 PowerShell 平台运行全部验证门禁：
   - `validate-structure`、`validate-skills`、`validate-workflows`、`validate-docs`、`validate-changelog`、`validate-manifest`、`run-workflows`。
4. 确认发布 commit 的 CI 为绿色。
5. 打 tag：`git tag -a vX.Y.Z -m "Agent Routines X.Y.Z"`。
6. 推送分支和 tag：`git push origin main vX.Y.Z`（需要人工确认）。
7. 从该 tag 创建 GitHub release，将 CHANGELOG 小节作为 release notes。

## 使用方升级指引

- 安装时固定到 tag，不要跟随 `main`。
- 使用 `--force`/`-Force` 重装前，先 diff 新 tag 与已安装版本的差异，并重新审阅将进入用户级目录的 skills。
- 卸载流程绝不移除未列出的内容；移除已重命名的例行流程需要对旧名称执行显式卸载。

## 弃用策略

在移除前至少一个 minor 版本，于该例行流程的 README 和 catalog 中标记 deprecated。移除属于 major 版本变更，且必须在 CHANGELOG 的 "Removed" 小节中列出。
