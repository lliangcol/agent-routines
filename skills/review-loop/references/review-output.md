# Review Output

The report leads with findings ordered by severity; everything else follows. A reader should know within five lines whether the change is safe to merge.

## Format

```markdown
## Findings

### High — wrong rounding direction in refund calculation
- Where: `src/billing/refund.ts:84`
- Scenario: partial refund of an odd-cent amount rounds up, refunding 1 cent more
  than charged; accumulates across line items.
- Status: fixed (iteration 1), regression test added.

### Low — redundant null check
- Where: `src/billing/refund.ts:42`
- Status: fixed (iteration 2).

## Not Fixed (with reasons)
- Medium — retry policy swallows the original error (`src/http/client.ts:120`):
  pre-existing, outside this diff. Out of scope; flagged for a follow-up.

## Gates
- `npm test -- --filter billing` → pass (iteration 2)
- `npm run lint` → pass

## Residual Test Gaps
- No test covers refund against an already-cancelled order; recommend adding one.
```

## Severity Rubric

- **High**: incorrect behavior reachable in normal operation — data corruption, money/quantity errors, security exposure, crash on a main path.
- **Medium**: incorrect behavior on edge paths, error-handling that hides failures, race windows, misleading API contracts.
- **Low**: dead code, naming/clarity issues that invite future bugs, redundant logic. Pure style without a defect mechanism is below the line — do not pad reports with it.

Severity reflects consequence, not confidence. A high-consequence finding you are unsure about stays High with the uncertainty stated, not demoted to Low.

## Required Fields per Finding

Where (file:line), scenario (the concrete input/sequence that triggers it), status (fixed in iteration N / not fixed + reason). A finding with no trigger scenario is an opinion; either develop it into a scenario or drop it.

## The Clean-Result Case

When no issues remain, say so directly — "no in-scope issues found after N iterations" — then list residual test gaps and out-of-scope observations. Never invent minor findings to make a review look thorough; an empty findings section with a substantive gaps section is a credible, useful result.

## Failure Cases

- Symptom: report mixes fixed and unfixed findings in one list. Consequence: the reader cannot tell what work remains. Keep status explicit per finding and unfixed items in their own section.
- Symptom: "found and fixed 12 issues" where 9 are whitespace. Consequence: severity inflation trains readers to skim, and the one real High gets skimmed too. Hold the rubric line.
