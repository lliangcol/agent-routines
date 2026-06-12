# Frontend Adaptation

Adapt only what the contract diff requires. Refactors discovered along the way are reported, not bundled.

## Adaptation Order

Work in dependency order so each layer compiles against the previous one:

1. API wrappers / client functions — paths, methods, parameter shapes.
2. Type definitions / interfaces — mirror the DTO changes exactly; do not "improve" naming during a sync.
3. Enum definitions and enum rendering — labels, colors, icon maps, exhaustive switches.
4. Validation — required flags, lengths, and patterns must match backend validation, not exceed it.
5. User-visible states — empty states, error-code-to-message maps, conditional UI driven by changed fields.

After each layer, run the narrowest available check (typecheck or path-limited build) before moving outward:

```bash
npx tsc --noEmit            # or the repo's own typecheck script
```

## Finding Every Reference

For each removed/renamed identifier, search before editing and record the count:

```bash
grep -rn "oldFieldName" src/ --include='*.ts' --include='*.tsx' --include='*.vue'
```

```powershell
Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.vue | Select-String -Pattern 'oldFieldName'
```

If a reference appears in code you were not asked to touch (another team's module, generated files), report it instead of editing it.

## Decision Criteria

- Generated API clients (OpenAPI, GraphQL codegen): regenerate from the new spec; never hand-edit generated output. If regeneration is not possible locally, stop and report.
- A backend field became required: decide whether the frontend can always supply it. If not, this is a backend issue to raise, not something to fake with a default value.
- An error code disappeared: keep its handler if stored or in-flight data can still produce it; mark it deprecated with a comment referencing the backend change.

## Failure Cases

- Symptom: sync compiles but one screen renders blanks. Wrong response: patch the screen. Correct response: a shared selector or mapper between wrapper and screen still reads the old field; search mappers and stores, not only components.
- Symptom: form submissions start failing with 400 after sync. Wrong response: loosen frontend validation. Correct response: the backend added a required field the form never collects; surface the gap as a product decision.
