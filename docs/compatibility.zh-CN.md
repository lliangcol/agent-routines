# 兼容性

Codex 和 Claude Code 都使用基于目录的 `SKILL.md` Skills，但它们扫描的路径不同。本仓库不依赖 claude.ai 或 Claude API 上传。本仓库分发的是基于文件的 Skills 和本地 workflow 脚本。

## 跨工具限制

- 工具特定的 frontmatter 和命令名应保持可选。
- 在可行时，Skill 正文应保持工具中立。
- Adapter 脚本负责工具特定的安装路径。
- 运行时行为取决于各 agent 的 Skill 发现实现。

## 可选功能

如果某个工具支持额外元数据，请将其放在适配器文档中，或清楚标记为可选，以便同一个 Skill 能被其他 agent 阅读。
