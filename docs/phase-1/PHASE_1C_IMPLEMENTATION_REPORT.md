# Phase 1C Implementation Report

Date: 2026-11-02  
Scope: payment lifecycle recovery and reconciliation in the disposable `phase1a_test` environment only.

## Implementation status

Phase 1C implements the lifecycle corrections required by `PHASE_1B_INDEPENDENT_SECURITY_REVIEW.md`. It is ready for a fresh independent review, but is **not self-accepted**.

No production access, staging migration, live payment, AzamPay integration, payment endpoint activation, or `next_auth` schema/data change was performed.

## Implemented corrections

### 1. Durable initiation attempts

Added `payment_initiation_attempts` with:

- one durable initiation attempt per payment;
- atomic `REQUESTED -> PENDING_PROVIDER` claim;
- claim owner and lease expiry;
- retry count, last operation, provider outcome and error;
- `OUTCOME_UNKNOWN`, `PROVIDER_ACCEPTED`, `DEFINITE_REJECTION` and `RECONCILIATION_REQUIRED` states.

A generic provider exception now produces `OUTCOME_UNKNOWN`, preserves the reservation and leaves the payment `VERIFICATION_REQUIRED`. Only an adapter-declared definite rejection releases the reservation.

`reconcilePaymentInitiation()` reclaims stale/unknown attempts and uses optional provider initiation lookup. If lookup is unavailable, it preserves uncertainty as `RECONCILIATION_REQUIRED` instead of blindly creating another provider session.

### 2. Provider-safe terminal transitions

`transitionPayment()` now permits only:

- `PENDING -> PROCESSING`
- `PROCESSING -> VERIFICATION_REQUIRED`

It cannot produce `FAILED`, `CANCELLED`, `EXPIRED`, `SUCCESS` or `REFUNDED`, and it no longer releases reservations.

Verified terminal provider results use `terminalPayment()`, which writes the terminal payment state, releases reservations, and records both payment and `RESERVATIONS_RELEASED` audit events in one transaction.

### 3. Two-stage settlement

Settlement now uses:

1. Provider verification outside a database transaction.
2. A second database transaction that locks the payment, allocations, reservations and entitlements.

Stage 2 revalidates:

- payment state;
- provider code;
- provider/internal reference;
- amount and currency;
- member reference;
- provider transaction identity;
- duplicate provider transaction identity;
- reservation ownership and expiry;
- active entitlements.

Provider status lookup failure no longer silently leaves an expired payment unresolved. Expired or already-reconciling payments move to `RECONCILIATION_REQUIRED`; active payments become `VERIFICATION_REQUIRED` while retaining their reservation.

### 4. Late provider success reconciliation

Added `RECONCILIATION_REQUIRED` payment status and `payment_reconciliation_cases`.

A provider `SUCCESS` that cannot be safely settled because a reservation expired, was replaced, or another payment funded the cycle now:

- preserves `provider_transaction_id`;
- opens an `OPEN` reconciliation case;
- stores structured JSON evidence;
- writes audit events;
- does not activate membership entitlement.

If the original reservation is still valid and exclusively owned, normal settlement may proceed.

### 5. Refund lease recovery

`payment_refund_requests` now includes:

- `claim_owner`;
- `claimed_at`;
- `lease_expires_at`;
- `retry_count`;
- `last_operation`;
- `last_error`.

Refund recovery semantics:

- `REQUESTED` can be claimed for provider execution.
- stale `PENDING_PROVIDER` with a provider reference can be claimed for verification only;
- stale `PENDING_PROVIDER` without a provider reference becomes `RECONCILIATION_REQUIRED` and is never blindly retried;
- `RECONCILIATION_REQUIRED` with a provider reference can verify the existing reference;
- `PROVIDER_CONFIRMED` completes local reversal without another provider call.

### 6. Test gateway enhancements

The disposable gateway now supports explicitly labeled scenarios:

- definite initiation rejection;
- timeout before provider acceptance;
- timeout after provider acceptance;
- initiation status lookup;
- delayed status verification;
- unique provider refund references;
- controlled refund confirmation.

These scenarios prove service behavior only; they do not claim undocumented AzamPay/provider guarantees.

## Finding-by-finding remediation matrix

| Phase 1B finding | Correction | Test evidence | Status |
|---|---|---|---|
| HIGH A: uncertain initiation treated as safe failure | Durable attempt, atomic claim, outcome states, provider lookup and reservation preservation | Definite rejection, timeout before/after acceptance, crash recovery and no duplicate session tests | PASS |
| HIGH B: late success ignored after expiry | Provider status checked before terminalization; late success records reconciliation and transaction identity | Late success with valid reservation, expired reservation and replaced/funded cycle | PASS |
| HIGH C: generic terminal transitions released reservations | Generic transition map restricted to non-terminal states; terminal release only through verified provider/definite rejection paths | FAILED/CANCELLED/EXPIRED/REFUNDED rejected in PENDING, PROCESSING and VERIFICATION_REQUIRED | PASS |
| HIGH D: refund permanently `PENDING_PROVIDER` | Claim owner, lease expiry, retry count, stale-claim recovery and provider-reference verification | Stale claim recovery, no duplicate external refund, provider-confirmed local recovery | PASS |
| MEDIUM: provider call inside settlement transaction | Two-stage outside-transaction verification and transactional revalidation | Stale verification race changes reservation before lock and produces reconciliation, not settlement | PASS |
| Provider lookup unavailable | Initiation reconciliation returns `RECONCILIATION_REQUIRED` | Implemented through optional `checkInitiation`; production provider semantics remain undocumented | PARTIAL/BLOCKED |
| Duplicate provider transaction during reconciliation | Stored in reconciliation case without violating payment transaction uniqueness | Validation test verifies `RECONCILIATION_REQUIRED`, no entitlement and case evidence | PASS |

## Files changed

- `lib/payments/types.ts`
- `lib/payments/gateways.ts`
- `lib/payments/service.ts`
- `migrations/phase1a/005_payment_lifecycle_recovery.sql`
- `tests/payment-lifecycle.test.mjs`
- `tests/payment-validation.test.mjs`
- `tests/payment-foundation.test.mjs` (Phase 1B reservation/refund assertions)
- `tests/payment-concurrency.test.mjs` / `tests/phase1a-worker.mjs` (existing coverage reused)

## Safety confirmations

- `next_auth` unchanged.
- No live payment routes enabled.
- No AzamPay adapter implementation added.
- Membership fees, penalties, grace periods, exemptions, cycle calculations and approval rules unchanged.
- Existing Phase 1A/1B protections remained green in the disposable suite.

## Review readiness

The implementation is ready for a fresh independent review. It should not be treated as accepted until that review verifies the code and tests independently.
