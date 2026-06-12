# Examples

## Example Final Summary

Every api-sync run ends with a summary in this shape; the SHAs make the sync auditable and repeatable:

```
Base branch: origin/main
Base SHA: 1a2b3c4
Target SHA: 5d6e7f8
Merge-base SHA: 1a2b3c4

Synced changes:
- POST /v2/orders: new optional field `couponCode` -> added to OrderCreateRequest type, order form, and wrapper.
- OrderStatus enum: new value PARTIALLY_REFUNDED -> added label, badge color, and switch case in OrderStatusTag.

Excluded changes (with reasons):
- GET /internal/metrics: new endpoint, frontend has no consumer.
- `traceId` response field: additive, observability-only, no UI requirement.

Not synced, needs decision:
- `customerEmail` request field became required; checkout form does not collect email. Raised to product, blocking.

Verification: `npx tsc --noEmit` clean; `npm run test -- order` 14/14 passed.
```

## Worked Decision Examples

- Backend renamed `userName` to `displayName` in the DTO but kept a serializer alias for one release: sync the frontend to `displayName` now, note the alias expiry, do not rely on the alias in new code.
- Backend added an enum value behind feature flag `NEW_REFUND_FLOW`: add the frontend rendering guarded by the same flag lookup; an unguarded label would leak the unreleased feature.
- Diff shows a DTO change in a module the frontend never calls: record it under excluded changes with the module name as the reason — an empty exclusion list in the summary usually means the diff walk was incomplete.
