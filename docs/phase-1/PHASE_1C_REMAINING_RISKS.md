# Phase 1C Remaining Risks

Date: 2026-11-02

## Acceptance status

Phase 1C is implemented and ready for fresh independent review. It is **not self-accepted**.

## BLOCKED

- AzamPay initiation, timeout, idempotency, callback authenticity, transaction lookup and refund semantics remain undocumented.
- Production handling of provider initiation timeouts cannot be claimed based on the synthetic adapter.
- Provider refund lookup for an uncertain call without a provider reference cannot be safely implemented without provider documentation.
- Canonical payment API routes remain disabled and are not covered by this phase.

## MEDIUM

- `reconcilePaymentInitiation()` is callable but no background sweeper currently claims expired initiation leases automatically.
- Reconciliation cases are persisted, but no administrative resolution workflow is implemented.
- The initiation attempt model intentionally allows one canonical attempt per payment; provider-specific retry requires definitive no-session evidence.
- Notification persistence still occurs after settlement/reconciliation rather than through a dedicated append-only inbox.
- `cycle_payment_status` remains a legacy projection without a unique `(user_id,cycle_year)` constraint.
- Manual refund evidence is hashed but no controlled evidence storage location exists.
- Audit events are structured but there is no external immutable audit sink.

## LOW

- Provider lookup is still a separate network call before the short settlement transaction; stale results are mitigated by lock-time revalidation but real provider timestamp/idempotency semantics are unknown.
- Reservation expiry remains a fixed 30-minute service constant and must be aligned with a real provider session expiry.
- Repository-wide TypeScript and ESLint debt remains substantial and pre-existing.
- Next.js build skips type validation due to existing project configuration.

## What remains unsafe until review

- No Phase 1C code should be connected to live routes.
- No real provider should be configured without official timeout/idempotency/refund documentation.
- Reconciliation cases require a defined operational resolution process before sandbox or production use.
- Existing `next_auth` and staging data still require separate migration planning.

## Independent review focus

A fresh review should specifically test:

1. Every crash boundary around initiation claim, provider call, result persistence and reconciliation.
2. Late provider success before and after reservation takeover.
3. Refund leases with no provider reference, existing reference and provider-confirmed local failure.
4. Stale verification races using independent DB connections/processes.
5. Whether generic transitions still have any path that releases a payable reservation.
6. Whether provider-specific assumptions were accidentally embedded in the synthetic adapter.
