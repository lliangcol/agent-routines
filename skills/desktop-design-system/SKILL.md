---
name: desktop-design-system
description: Use this skill for desktop productivity UI design systems, design tokens, dense tables, status markers, theme tokens, and non-AI-looking Electron app visual standards.
os: cross-platform
---

# desktop-design-system

Use this Skill when designing or reviewing desktop app UI for a practical operator console.

## Operating System Support

`os: cross-platform`. UI rules should work with Windows, macOS, and Linux system font stacks and native window conventions.

## Flow

1. Start from the target workflow, not a landing page. 2. Define tokens for color, spacing, typography, borders, focus, and status. 3. Use dense tables, matrices, forms, and task panels where appropriate. 4. Support light, dark, and system themes. 5. Avoid decorative AI-style visuals. 6. Verify long Chinese and English labels.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: doc-check, gate-check

## Human Confirmation Gates

Ask before adopting a new component library, replacing the app visual direction, or introducing brand assets from external tools.

## Failure Routing

Separate visual hierarchy issues, accessibility issues, text overflow, theme token gaps, and inconsistent component behavior.
