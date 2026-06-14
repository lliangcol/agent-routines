# doc-check Workflow

## 目的

聚合文档检查和可选安全自定义命令；当缺少运行时依赖时报告缺口，而不是假设 Python 存在。

## 自定义命令

自定义命令会经过控制字符、破坏性关键字和只读 allowlist 的 best-effort 筛查；这不是安全边界，调用方仍需只传只读命令。

## 说明

本文件是面向用户的中文 README companion；workflow 行为以脚本和 schema 为准。
