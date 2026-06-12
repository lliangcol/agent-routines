# 当前项目深度审计报告

**审计对象**：`agent-routines`（main 分支，HEAD `b004c14`，工作区干净）
**审计日期**：2026-06-12
**证据基础**：本地只读静态审查 + 真实运行证据（8 个验证器、10 个 Bash 工作流、4 个 PowerShell 7 工作流、2 个 Windows PowerShell 5.1 运行均实际执行并通过）。审计全程未产生任何仓库变更。

---

## 1. 总体结论

**Verdict：有条件落地。**

该仓库是一个纯 Markdown + Bash/PowerShell 的 AI Agent Skills/Workflows 分发库（无任何运行时依赖）。其工程脚手架质量高于平均水平：结构约定清晰、双实现（.sh/.ps1）实测行为一致、安装器有名称白名单校验和防覆盖设计、8 个验证器全部通过、所有实测工作流输出合法 JSON 且退出码正确。作为个人或小团队的内部例行流程库，现在即可落地使用。

但它暂不具备对外推广的成熟度，核心原因有三：(1) 它分发的"知识载荷"是空壳——19 个 SKILL.md 是 37 行的模板复制，references 多为 2 行占位句；(2) 治理闭环未闭合——验证器存在但没有任何 CI 自动执行，无 tag、无 CONTRIBUTING；(3) 维护债务已埋下——34 个入口脚本无共享库，其中 12 个是逐字节相同的模板复制件且各含 5 个死分支。

本结论基于本地静态/只读验证证据，并包含部分真实运行证据（验证器与只读工作流）；不包含安装到 Codex/Claude Code 后的端到端行为验证，不宣称生产可用性。

## 2. 成熟度评分（0–5）

| 维度 | 评分 | 简短证据 |
|---|---|---|
| 稳定性 | 3 | 10 个 Bash 工作流实测全部输出合法 JSON、`ok=true`、exit 0；PS/Bash 检查数一致。但 JSON 为手工字符串拼接，`json_escape` 不处理控制字符，且零执行级测试护栏 |
| 可维护性 | 2 | 6 个 204 行 `.sh` 除第 4 行外逐字节相同，6 个 210 行 `.ps1` 同理；其余 11 对脚本再各自复制一遍 JSON 辅助函数；`validate-structure` 的 136 路径清单在 .sh/.ps1 各硬编码一份 |
| 可扩展性 | 3 | 目录约定统一且被验证器强制；manifest 分发模型设计好。但新增 1 个 workflow 需手工同步 4+ 处，authoring guide 仅 4 行 |
| 可治理性 | 2 | 8 个验证器齐备且双实现，但无 `.github/`（无 CI）、无 git tag、无 CONTRIBUTING.md、git 历史仅 2 个 commit |
| 可推广性 | 2 | README/双语文档/catalog/examples 结构完整、Quick Start 实测可用；但被分发的 Skills 内容极薄（全部 references 合计 175 行，多数文件 2 行） |
| 长期演进 | 2.5 | 文档骨架和验证器是好的演进基础；但模板复制债务会随 workflow 数量线性放大，且没有测试护栏拦截回归 |
| 安全/依赖治理 | 3.5 | 零外部依赖；security-check 输出脱敏；安装器默认不覆盖、卸载器必须显式点名。减分项：`--custom-command` 黑名单可绕过 |
| 文档与上手体验 | 3 | README 命令逐条实测可执行；catalog/examples 双语齐全。减分项：多篇核心文档为 4–6 行占位，catalog 交叉引用有漂移 |

## 3. 关键发现

| ID | 严重级别 | 维度 | 发现 | 证据 | 影响 | 建议处理 |
|---|---|---|---|---|---|---|
| F-01 | P1 | 可治理性 | 无任何 CI：8 个验证器只能靠人工记得去跑 | `.github/` 不存在；220 个 tracked 文件中无 CI 配置 | 验证门禁形同虚设，治理闭环断裂 | 添加 GitHub Actions 双平台矩阵 |
| F-02 | P1 | 可推广性 | Skills 知识载荷是空壳：SKILL.md 为模板复制，references 多为 2 行占位 | 全部 references 合计 175 行，13 个文件仅 2 行 | 用户安装后得到的指导≈零 | 充实真实操作知识或收敛数量 |
| F-03 | P1 | 可维护性 | 12 个工作流脚本是同一模板的逐字节复制件，各含 5 个死分支 | `diff <(sed '4d' preflight.sh) <(sed '4d' gate-check.sh)` = 0 行差异 | 修一个 bug 要改 34 个文件；行为面与文档不符 | 特化脚本并删除死分支 |
| F-04 | P1 | 稳定性 | 零执行级测试：tests 只做静态检查，从不运行工作流脚本；schema 松散且不参与校验 | `tests/validate-workflows.sh:20-38`；`schema.json` `additionalProperties:true` 无 item schema | 脚本回归不会被任何测试捕获 | 增加冒烟测试 + 收紧 schema |
| F-05 | P2 | 安全 | `--custom-command` 黑名单 + `sh -c` 可被绕过，与 "performs only readonly checks" 声明矛盾 | `preflight.sh:89-101` | "只读"承诺过强 | 改为尽力拦截声明 |
| F-06 | P2 | 稳定性 | JSON 手工拼接转义不完整：漏 `\b` `\f` 与控制字符 | `commit-check.sh:27` vs `preflight.sh:33-43` | 控制字符产生非法 JSON | 统一并补全转义 |
| F-07 | P2 | 文档 | catalog Matching skills 列与 SKILL.md 双向不一致 | `docs/catalog.md:33,36` vs `skills/archive-record/SKILL.md:30` | 按 catalog 路由会错装 | 修正并加一致性校验 |
| F-08 | P2 | 可治理性 | CHANGELOG 0.1.0 无 tag；无 CONTRIBUTING/SECURITY/模板 | `git tag -l` 空 | 无法 pin 版本 | 打 tag、补流程文档 |
| F-09 | P2 | 可扩展性 | validate-structure 的 136 条路径清单在 .sh/.ps1 各硬编码一份 | `tests/validate-structure.sh:8-35` vs `.ps1:8-35` | 清单漂移产生假阴性/假阳性 | 清单提为单一数据文件 |
| F-10 | P3 | 文档 | distribution.zh-CN.md 缺英文版 JSON 示例与默认 manifest 段落 | 55 行 vs 32 行 | 中文读者缺关键示例 | 补译并校验成对 |
| F-11 | P3 | 可治理性 | 仓库自身无 AGENTS.md/CLAUDE.md | `ls AGENTS.md CLAUDE.md` exit 2 | 自我示范缺失 | 添加最小 AGENTS.md |
| F-12 | P3 | 稳定性 | startup-check 在 SKILL.md 层无任何 skill 推荐 | grep 无命中 | 孤儿工作流 | 补进 env-audit 推荐 |

**正面发现**：安装器/卸载器质量显著高于脚本平均水平（kebab-case 白名单校验、默认不覆盖、先收集错误再复制、Tab 注入防护、三重解析器回退、卸载强制点名）。跨平台声明大体属实（LF 强制、无 PS7-only 语法、无非 ASCII、PS 5.1 实测通过 2 个脚本）。

## 4. 架构与运行面总结

源仓库是唯一维护事实来源。三层模型：Skills（判断力，Markdown）→ Workflows（确定性只读探针，.sh/.ps1 双实现，统一 7 键 JSON）→ Adapters（复制安装到 `~/.claude/skills`、`~/.codex/skills`、`~/.agent-routines/workflows` 及项目级目录）。资产：19 Skills、17 Workflows、24 篇文档（12 对双语）、1 个分发 manifest。验证链路全部为静态检查，无执行验证，无 CI 触发。发布链路：GitHub 远程已配置，MIT 许可，CHANGELOG 单条 0.1.0，无 tag。

## 5. 验证证据

见 [evidence/commands.md](evidence/commands.md)。

## 6. 落地能力判断

| 问题 | 判断 |
|---|---|
| 是否稳定可用 | Conditional（实测正确但无机制保证） |
| 是否适合维护 | Conditional（当前规模尚可，复制债务随规模恶化） |
| 是否容易扩展 | Conditional（约定强制但同步成本高、指南缺失） |
| 是否具备治理闭环 | No（无 CI、无 tag、无 CONTRIBUTING） |
| 是否适合对外推广 | No（当前；知识载荷空壳会透支信任） |
| 是否支持长期演进 | Conditional（模型正确，需先偿还结构性债务） |

## 7. 修复与演进路线图

**立即修复（0–7 天）**
1. 添加 GitHub Actions CI：ubuntu + windows 双矩阵运行验证器（F-01）。
2. 打 `v0.1.0` tag（F-08）。
3. 修正 `docs/catalog.md` Matching skills 漂移（F-07）。
4. 弱化 "performs only readonly checks" 声明或移除 `--custom-command`（F-05）。

**短期完善（2–4 周）**
5. 执行级冒烟测试 + 收紧 schema（F-04）。
6. 消除 12 份模板复制件、删除死分支（F-03）。
7. validate-structure 清单提为单一数据文件（F-09）。
8. 补 CONTRIBUTING.md、AGENTS.md、补齐 distribution.zh-CN.md（F-08/F-10/F-11）。

**中期演进（1–3 个月）**
9. 充实 Skills 知识载荷（F-02，决定可推广 verdict 能否翻转的关键）。
10. 双语成对校验与 SKILL.md ↔ catalog 一致性校验纳入验证器。
11. 版本化发布流程 + PS 5.1 全量兼容性测试。

## 8. 未验证项 / 假设

- 安装/卸载端到端行为：未实际执行（会写用户目录），仅静态审查。
- Codex/Claude Code 的 Skill 发现机制路径是否如文档所述：未验证。
- macOS/Linux 原生行为：仅在 Windows Git Bash（MSYS）下实测。
- PS 5.1 全量兼容：仅实测 2 个脚本。
- 远程仓库状态：未 fetch，远程 tag/CI 未知。
- codebase-memory-mcp：本项目未索引，按规则 fallback 到直接阅读。
- 域特定工作流在真实目标场景的行为：仅在本仓库运行或静态审查。

## 9. BLOCKED

无。
