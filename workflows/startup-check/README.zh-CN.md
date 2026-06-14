# startup-check Workflow

## 目的

检查 Windows 启动来源，例如 Run keys、StartupApproved keys 和类似启动项的 scheduled tasks，不移除注册表值，也不禁用任务。

## 支持系统

Windows PowerShell 5.1/PowerShell 7+ 支持完整检查；Bash on Windows 可使用 `reg.exe` 和 `schtasks.exe`；macOS 和 Linux 会报告启动来源不支持。

## 说明

本文件是面向用户的中文 README companion；workflow 行为以脚本和 schema 为准。
