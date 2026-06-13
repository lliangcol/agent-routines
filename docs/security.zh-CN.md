# 安全

不要安装不可信的 Skills。将其复制到用户级位置前，请审阅 `SKILL.md`、references、workflow 脚本和 adapters。

脚本不得默认执行破坏性操作。数据库写入、生产配置、commit/push、删除、外部发布和 DMS 执行都需要人工确认。默认禁止直接写入生产环境。

安装只复制本地文件。它不会授权未来的 agent 绕过仓库规则、人工门禁或业务系统审批流程。

公开发布面必须包含根目录 `SECURITY.md` 和 `SUPPORT.md`。打 tag 前请以 public 模式运行 `release-check`：

```powershell
.\workflows\release-check\release-check.ps1 -Path . -Public
```

```bash
./workflows/release-check/release-check.sh --path . --public
```

`SECURITY.md` 用于漏洞报告和敏感证据处理。`SUPPORT.md` 用于非敏感的使用、安装和验证问题。
