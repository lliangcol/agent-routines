# i18n-checklist

## Use Cases

English and Simplified Chinese UI text, translation-key coverage, language switching, text expansion, status labels, and bilingual screenshot QA.

## Non-Use Cases

Full technical writing, legal translation, or translating source identifiers and command names.

## Supported OS

Windows, macOS, and Linux. UI language behavior should be tested independently from OS locale when possible.

## Inputs

Translation files, UI screenshots, status keys, language switch behavior, and target terminology.

## Outputs

Missing keys, inconsistent translations, untranslated UI text, overflow risks, and language-switch verification notes.

## Execution Steps

Inspect translation key usage, compare English and Simplified Chinese strings, test switch behavior, check screenshots, and summarize fixes.

## Human Confirmation Points

Terminology changes, public doc rewrites, and translation of identifiers that may be intentionally stable.

## Failure Handling

If screenshots are unavailable, mark visual truncation checks as partial and require UI capture before final approval.

## Example Prompts

- "Use `i18n-checklist` to verify Simplified Chinese and English switching in the settings page."
- "Use `i18n-checklist` to review translation keys and status labels before release."

## Recommended Workflows

doc-check, gate-check
