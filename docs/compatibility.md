# Compatibility

Codex and Claude Code both use folder-based `SKILL.md` Skills, but scan different paths. This repository does not rely on claude.ai or Claude API upload. The repository distributes file-based Skills and local workflow scripts.

## Cross-Tool Limits

- Tool-specific frontmatter and command names should stay optional.
- Skill bodies should remain tool-neutral where practical.
- Adapter scripts own tool-specific install paths.
- Runtime behavior depends on each agent's Skill discovery implementation.

## Optional Features

If a tool supports extra metadata, keep it in adapter documentation or clearly mark it optional so the same Skill can be read by other agents.