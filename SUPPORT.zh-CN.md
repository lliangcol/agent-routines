# 支持说明

## 从哪里开始

关于 Skills、workflows、文档和安装适配器的公开且非敏感问题，请使用仓库 issue 或 pull request。涉及漏洞或敏感证据时，请使用 `SECURITY.md` 中的私密安全流程。

## 需要提供的信息

workflow 或 adapter 问题请提供：

- 操作系统和 shell。
- 执行的命令和退出码。
- 脱敏后的 JSON 输出或错误文本。
- 仓库 tag 或 commit。
- 目标是用户级、项目级还是 manifest 安装。

## 支持边界

本仓库支持自身分发的 routines。不负责私有业务系统、生产数据库访问、agent 厂商事故、包管理器故障，或必须在仓库外轮换的凭据。

## 升级路径

如果 routine 阻塞发布、安装或安全审查，请提供失败的具体 validation gate 和最小复现用例。维护者可能要求按照 `executions/` 归档布局提供脱敏执行记录。
