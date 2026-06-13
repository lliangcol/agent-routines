# Security

Do not install untrusted Skills. Review `SKILL.md`, references, workflow scripts, and adapters before copying them into user-level locations.

Scripts must not default to destructive operations. DB writes, production configuration, commit/push, deletes, external publishing, and DMS execution require human confirmation. Direct production writes are forbidden by default.

Installation copies local files only. It does not authorize a future agent to bypass repository rules, human gates, or business-system approval processes.

Public release surfaces must include root-level `SECURITY.md` and `SUPPORT.md`. Run `release-check` in public mode before tagging:

```powershell
.\workflows\release-check\release-check.ps1 -Path . -Public
```

```bash
./workflows/release-check/release-check.sh --path . --public
```

Use `SECURITY.md` for vulnerability reporting and sensitive-evidence handling. Use `SUPPORT.md` for non-sensitive usage, installation, and validation questions.
