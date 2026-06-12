# Security

Do not install untrusted Skills. Review `SKILL.md`, references, workflow scripts, and adapters before copying them into user-level locations.

Scripts must not default to destructive operations. DB writes, production configuration, commit/push, deletes, external publishing, and DMS execution require human confirmation. Direct production writes are forbidden by default.

Installation copies local files only. It does not authorize a future agent to bypass repository rules, human gates, or business-system approval processes.