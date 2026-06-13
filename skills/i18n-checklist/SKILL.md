---
name: i18n-checklist
description: Use this skill for Simplified Chinese and English UI localization checks, translation keys, text expansion, status label stability, and language-switch QA.
os: cross-platform
---

# i18n-checklist

Use this Skill when adding, reviewing, or testing bilingual UI for English and Simplified Chinese.

## Operating System Support

`os: cross-platform`. Locale-sensitive behavior should not depend on a single host OS.

## Flow

1. Keep user-facing text in translation keys. 2. Keep command names, paths, JSON fields, and routine identifiers untranslated. 3. Use stable internal status keys. 4. Test English and Simplified Chinese text lengths. 5. Verify language switching without restart. 6. Report missing keys, stale translations, and truncation.

## Workflow Routing

Prefer installed runtime paths:

- User: `~/.agent-routines/workflows`
- Project: `.agent-routines/workflows`

Source fallback:

- `workflows/<workflow-name>/`

Recommended workflows: doc-check, gate-check

## Human Confirmation Gates

Ask before changing terminology standards, translating identifiers, or rewriting public docs outside the requested language scope.

## Failure Routing

Separate missing translations, inconsistent terms, runtime language-switch bugs, text overflow, and incorrectly translated technical identifiers.
