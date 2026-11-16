# Phase 1B Implementation Report

Date: 2026-11-02  
Scope: remediation of all CRITICAL, HIGH and applicable MEDIUM findings from `PHASE_1A_INDEPENDENT_CODE_REVIEW.md`. All verification used disposable `phase1a_test`; `next_auth` remains unchanged.

## Implementation summary

### Cycle funding integrity

- Added durable `payment_cycle_reservations` with unique `(user_id, cycle_year)`.
- Initiation locks the authenticated member and reservation rows.
- Reservations bind to exactly one `payment_id`.
- Active, settled and expired states have separate behavior.
- Settlement locks reservations and allocations, verifies ownership, rejects entitlement overwrite, and records reconciliation-required audit evidence for externally collected but locally unsettleable payments.
- Failed/cancelled/expired transitions release reservations.
- Refund completion releases only the refunded cycle reservation.

### Settlement authorization

- `SUCCESS` remains absent from generic transitions.
- `REFUNDED` is now absent from generic transitions; generic `transitionPayment()` cannot complete refunds.
- Settlement derives `provider_code` from the locked payment transaction, not caller input.
- `providerTransactionId` is mandatory for `SUCCESS`.
- Provider reference, amount, currency, member reference and provider state remain independently validated.
- Gateway registration is immutable and test adapters require `PHASE1A_TEST_DB=1` plus non-production `NODE_ENV`.

### Authenticated initiation

- `createPaymentIntent()` now requires `actingUserId`.
- Optional `memberId` may not differ from `actingUserId`; mismatch is rejected as impersonation.
- Initiation locks the user row and requires `is_approved = 1`.
- Amounts continue to come from `listFutureUnpaidCycles()`.

### Refund outbox

- Added `payment_refund_requests` durable lifecycle:
  `REQUESTED -> PENDING_PROVIDER -> PROVIDER_CONFIRMED -> COMPLETED`.
- Provider calls occur outside DB transactions.
- Allocations move `PAID -> REFUNDING` inside the authorized request transaction.
- Atomic request claiming prevents concurrent provider calls.
- Provider refund reference is persisted before confirmation.
- An uncertain request without provider reference cannot blindly repeat provider initiation.
- Provider-confirmed/local-failure recovery completes locally without another provider call.
- Completion creates refund/refund-allocation records, reverses only matching entitlements, preserves original payment, updates only the funding reference, refreshes membership projection, releases reservation, and audits actor/request/refund IDs.

### Membership projection and audit

- New membership rows preserve `membership_type` where present, or derive organization category without changing business rules.
- Membership number uses `membership_sequence` transactionally instead of synthetic `userId` numbering.
- Audit events now persist structured `event_data` and actor foreign-key integrity.
- Notifications require provider event IDs and are provider-scoped/deduplicated.

## Files changed

- `lib/payments/service.ts`
- `lib/payments/gateways.ts`
- `migrations/phase1a/003_payment_integrity_remediation.sql`
- `migrations/phase1a/004_audit_actor_integrity.sql`
- `tests/payment-foundation.test.mjs`
- `tests/payment-concurrency.test.mjs`
- `tests/payment-validation.test.mjs`
- `tests/phase1a-worker.mjs`
- Phase 1B documentation under `docs/phase-1/`

## Verification results

- Focused disposable suite: **3 tests passed, 0 failed**
- Standard `npm test`: **6 passed, 3 gated skips, 0 failed**
- Focused ESLint: **0 findings**
- Focused TypeScript: **PASS**
- Repository TypeScript: **FAIL — 340 lines of pre-existing errors; none in `lib/payments` or Phase 1 tests**
- Repository ESLint: **FAIL — 673 problems (451 errors, 222 warnings), pre-existing**
- Production build: **PASS — type validation remains skipped by existing config**
- `git diff --check`: **PASS**

## Readiness

Phase 1B remediation is ready for independent review. It is not self-declared accepted. Live payments remain disabled and AzamPay remains blocked.
