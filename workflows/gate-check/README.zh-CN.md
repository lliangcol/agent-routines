# gate-check Workflow

## 目的

运行安全的通用门禁，例如 git diff 检查和明确传入的非破坏性自定义命令。

## 自定义命令

自定义命令会经过控制字符、破坏性关键字和只读 allowlist 的 best-effort 筛查；调用方仍需只传只读命令。

## 说明

本文件是面向用户的中文 README companion；workflow 行为以脚本和 schema 为准。
