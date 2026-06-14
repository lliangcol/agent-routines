# release-check Workflow

## 目的

检查公开发布就绪信号，例如 package metadata、README、license、安全说明、changelog、workflow 证据和 release tooling。

## 边界

不发布、不打 tag、不 push、不修改版本、不安装依赖、不创建产物。Public 模式会要求 `SECURITY.md` 和 `SUPPORT.md`。

## 说明

本文件是面向用户的中文 README companion；workflow 行为以脚本和 schema 为准。
