# security-review Checklist

- Define the public or commit boundary.
- Run security-check locally.
- Do not print sensitive values.
- Report finding type, path, line, and confidence.
- Separate high-confidence blockers from low-confidence manual review items.
- Check package include/exclude rules when a release is involved.
- Do not delete, rotate, rewrite history, or publish without confirmation.
