# Workflow 编写指南

每个 workflow 都需要 README、PowerShell 脚本、Bash 脚本、schema 和示例输出。脚本输出稳定 JSON，并包含 `ok`、`workflow`、`cwd`、`os`、`checks`、`warnings` 和 `errors`。

工作流应保持确定性和安全性。它们应清楚报告缺失的运行时，并将非零退出码保留给无效参数或校验失败。
