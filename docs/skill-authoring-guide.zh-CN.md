# Skill 编写指南

Skill 是判断层：何时行动、按什么顺序行动、风险边界在哪里、何时停下来询问人类。确定性检查属于 workflow，不属于 Skill 正文。

## 必需结构

每个 skill 目录包含 `SKILL.md`、`README.md` 和至少有一个实质性文件的 `references/` 目录。

`SKILL.md` frontmatter（由 `tests/validate-skills` 强制）：

- `name`：小写 kebab-case，与目录名一致；不得包含 `claude`、`anthropic`、XML 标签、空格或大写字母。
- `description`：一句话说明该 Skill 做什么、何时调用（最多 1024 字符）。
- `os: cross-platform`。

正文部分覆盖操作系统支持、流程、workflow 路由、人工确认门禁和失败路由。

## Recommended Workflows 行

`Recommended workflows:` 行会被 `tests/validate-docs` 机器解析。列出存在的 workflow 目录名（逗号分隔），或写 `none required`。catalog（`docs/catalog.md`、`docs/catalog.zh-CN.md`）中该 skill 行必须镜像此行，且 workflow 行的匹配列必须等于推荐该 workflow 的 skill 集合。

## References 必须有实质内容

References 是用户真正安装到手的载荷。一个 reference 文件只有包含以下至少一项才算合格：

- 决策树或明确的决策标准（"若 X 且 Y，做 A；若 X 无 Y，停下询问"），
- 具体命令序列、预期输出，以及输出不符时的处理方式，
- 真实失败案例：症状、看似正确的错误反应、正确反应。

一句话占位文件不可接受；如果一个 Skill 的 references 无法填入真实操作知识，应当移除该 Skill，而不是空壳发布。

References 保持工具中立和跨平台：行为有差异时显式注明操作系统或 shell，命令有差异时同时提供 PowerShell 和 POSIX 两种写法。

## 新增 Skill 检查单

1. 创建 `skills/<name>/SKILL.md`、`README.md` 和有实质内容的 `references/`。
2. 将 `SKILL.md` 路径加入 `tests/required-paths.txt`。
3. 在两个 catalog 文件中加入与 `Recommended workflows:` 行一致的行。
4. 决定该 skill 是否进入 `distribution/agent-routines.manifest.json`。
5. 在两种 shell 中运行 `validate-structure`、`validate-skills`、`validate-docs`、`validate-manifest`。
