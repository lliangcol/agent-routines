# security-check Workflow

## 目的

扫描本地文件中的高置信 secret-like 模式和需要人工复核的私有路径信号，不打印敏感值、不删除文件、不轮换凭据、不重写历史、不发布结果。

## 跳过目录

跳过嵌套 `node_modules`、`dist`、`build`、`out`、`release`、`coverage`、临时缓存和 `__pycache__` 等生成目录。

## 说明

本文件是面向用户的中文 README companion；workflow 行为以脚本和 schema 为准。
