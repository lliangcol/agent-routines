# 跨平台支持

## 支持矩阵

| 目标 | Shell | 状态 |
| --- | --- | --- |
| Windows 10/11 | Windows PowerShell 5.1、PowerShell 7+、可用时的 Git Bash | 支持 |
| macOS | Bash、PowerShell 7+ | 支持 |
| Linux | Bash、PowerShell 7+ | 支持 |

## 路径差异

在可移植文档中使用 `~` 或 `$HOME`。Windows 示例可以显示 `%USERPROFILE%`。脚本应在 PowerShell 中使用 `Join-Path` 构造路径，在 Bash 中使用带引号的变量。

## Shell 差异

PowerShell 使用对象和命名参数。Bash 使用字符串、退出码和带引号的变量。除非通过操作系统检测进行保护并提供回退路径，否则应避免使用仅限 Windows 的命令。

## 行尾

Bash 脚本应使用 LF 行尾。PowerShell 脚本可接受 CRLF 或 LF。生成的归档和示例应保持跨工具可读。

## 操作系统特定函数和回退路径

除非已获得确认，Windows 配置档案只能以只读模式检查注册表或启动项位置。macOS/Linux 配置档案应检查 shell 可用性、PATH、包管理器存在性、可执行权限、行尾和运行时版本。

## macOS/Linux 回退行为

如果缺少 PowerShell 7，请使用 Bash 脚本。如果缺少包管理器，请报告缺失的前置条件，而不是尝试安装。

## 测试策略

在 Windows 和 PowerShell 7 目标上运行 PowerShell 校验器。在 macOS/Linux 和可用的 Git Bash 上运行 Bash 校验器。除非请求的 workflow 依赖对应运行时，否则将缺失运行时视为警告。
