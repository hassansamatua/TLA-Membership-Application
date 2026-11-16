# Phase 1B Independent Security and Financial-Integrity Review

Date: 2026-11-02  
Review type: independent review-only assessment.  
Database scope: disposable `phase1a_test` only. `next_auth` was inspected read-only and remains unchanged.

## Executive assessment

**Final decision: REJECTED**

Phase 1B corrects the principal defects demonstrated in the Phase 1A review: cycle reservations, authenticated initiation, provider-bound settlement, mandatory transaction identity, immutable gateway registration, non-generic refund completion, and a durable refund outbox are materially improved and covered by passing disposable tests.

However, fresh review found remaining financial-integrity defects in lifecycle edge cases:

1. **HIGH — uncertain gateway initiation is treated as safe failure.** Any `gateway.initiatePayment()` error causes `PENDING -> FAILED` and releases the reservation. A provider timeout or ambiguous transport error could mean the provider session was created. Releasing the reservation at that point allows a second payment session while the first may still collect money.

2. **HIGH — payment expiry is checked before provider verification.** If `payment_transactions.expires_at` has passed, `settlePayment()` marks the payment `EXPIRED` without asking the gateway for its status. A late successful callback is ignored, provider transaction identity is discarded, and no settlement reconciliation event is recorded.

3. **HIGH — generic expiry/cancellation can release an active provider-session reservation without reconciliation.** `transitionPayment()` permits `FAILED`, `CANCELLED`, and `EXPIRED` transitions for `PENDING`, `PROCESSING`, and `VERIFICATION_REQUIRED`. Those transitions release reservations without consulting provider state. An internal caller can therefore free a cycle while an externally initiated checkout may still be payable.

4. **HIGH — `PENDING_PROVIDER` refund requests can become permanently stuck.** If the process crashes after provider refund initiation or after receiving a provider reference but before `PROVIDER_CONFIRMED`, a retry sees `PENDING_PROVIDER` and returns “already being processed.” There is no stale-claim timeout, re-verification path, or reconciliation transition. This blocks both recovery and duplicate-safe completion.

5. **MEDIUM — settlement calls provider verification while holding DB transaction locks.** `settlePayment()` begins a transaction, locks the payment, and then calls `gateway.checkTransactionStatus()`. A slow provider call extends lock lifetime and can increase deadlocks.

These defects mean Phase 1B should not yet be accepted for sandbox integration or production planning.

## Scope of review

Reviewed:

- `docs/phase-1/PHASE_1A_INDEPENDENT_CODE_REVIEW.md`
- `docs/phase-1/PHASE_1B_*.md`
- `lib/payments/types.ts`
- `lib/payments/gateways.ts`
- `lib/payments/service.ts`
- `migrations/phase1a/001_member_schema_alignment.sql`
- `migrations/phase1a/002_payment_foundation.sql`
- `migrations/phase1a/003_payment_integrity_remediation.sql`
- `migrations/phase1a/004_audit_actor_integrity.sql`
- `tests/payment-foundation.test.mjs`
- `tests/payment-concurrency.test.mjs`
- `tests/payment-validation.test.mjs`
- `tests/phase1a-worker.mjs`
- `lib/enhancedMembershipCycles.ts`
- `lib/api-access.ts`
- `tsconfig.json`
- `package.json`

## Independent test evidence

### Focused disposable suite

Executed:

```bash
PHASE1A_TEST_DB=1 MYSQL_DATABASE=phase1a_test \
node --test tests/payment-foundation.test.mjs \
  tests/payment-concurrency.test.mjs \
  tests/payment-validation.test.mjs
```

Actual result:

```text
tests 3
pass 3
fail 0
skipped 0
duration_ms 2220.9873
```

This confirms the implemented scenarios pass. It does not invalidate the lifecycle defects below because those paths are absent or incompletely covered.

### Standard tests

`npm test` result:

```text
tests 9
pass 6
skipped 3
fail 0
```

The disposable tests correctly skip without explicit `PHASE1A_TEST_DB=1`.

### Focused checks

- Focused TypeScript: PASS
- Focused ESLint: PASS
- Production build previously observed: PASS, while type validation remains skipped by existing configuration
- `git diff --check`: PASS
- Repository TypeScript: FAIL — 340 lines of pre-existing errors
- Repository ESLint: FAIL — 673 problems (451 errors, 222 warnings), broad pre-existing debt

## Finding-by-finding remediation verification

### Original CRITICAL findings

| Finding | Independent verification | Status |
|---|---|---|
| Duplicate payments could fund one cycle | `payment_cycle_reservations` has unique `(user_id,cycle_year)`; initiation locks/reuses or rejects rows; settlement locks reservation rows and requires same `payment_id`; entitlement overwrite is blocked | PASS |
| Generic `SUCCESS -> REFUNDED` bypassed refund controls | `SUCCESS` has no generic outgoing transition; `transitionPayment` cannot create `REFUNDED`; refund completion is only in `refundPaymentAllocations` | PASS |

### Original HIGH findings

| Finding | Independent verification | Status |
|---|---|---|
| Caller-selected settlement provider | `settlePayment` now derives `payment.provider_code` from locked payment row | PASS |
| Arbitrary member ID initiation | `actingUserId` required; mismatched `memberId` rejected; `is_approved` checked under user lock | PASS |
| Optional transaction identity | Missing `providerTransactionId` is rejected before financial effects | PASS |
| Provider/local refund divergence | Durable request/outbox exists and provider calls occur outside the completion transaction | PARTIAL — confirmed-result recovery works, but `PENDING_PROVIDER` can deadlock operationally |
| Cycle eligibility not locked | Reservation rows are locked; active entitlement and legacy paid row are rechecked inside transaction | PASS |

### Original MEDIUM findings

| Finding | Independent verification | Status |
|---|---|---|
| Membership type/number projection | Uses `membership_type`/`user_category` and `membership_sequence` | PARTIAL — sequence is locked, but organization/multi-process sequence coverage is incomplete |
| Refund erased unrelated cycle status | Reversal now matches `payment_reference` | PASS |
| Generic transition authorization | Financial `SUCCESS`/`REFUNDED` paths removed, but generic FAILED/CANCELLED/EXPIRED can still release a live reservation without provider reconciliation | PARTIAL |
| Provider event uniqueness | Provider-scoped event uniqueness and mandatory event ID implemented | PASS |
| Notification persistence after settlement | Retry prevents duplicate effects; event row may still be absent if process dies before insert | PARTIAL |
| Evidence hash only | Approval/evidence requirements enforced, but evidence storage location remains undefined | PARTIAL |
| Audit details | `event_data` JSON added | PASS |
| Legacy `ON DUPLICATE` assumption | Code now selects/locks existing row before insert/update | PARTIAL — legacy duplicate rows can still exist because no unique key was added |
| Organization projection | Mapping exists | PARTIAL — no dedicated organization fixture proving production behavior |
| Mutable gateway registry | Duplicate provider registration rejected; test gateway requires disposable flag/non-production env | PASS |
| Optional event ID | Event ID now required | PASS |
| Nullable unique fields | Settlement requires transaction ID; provider references required before success/refund confirmation | PASS |

## Fresh critical/high findings

### 1. Uncertain gateway initiation is unsafe — HIGH

`createPaymentIntentOnce()` catches any initiation error and calls:

```ts
transitionPayment(paymentId, 'FAILED', 'gateway', { reason: 'initiation failed' })
```

`transitionPayment()` then releases the reservation.

This is safe only for a definitive provider rejection. It is not safe for timeout, network interruption, client disconnect, process crash after provider receipt, or a response parse error. In those cases the provider session may exist and may later collect money.

The disposable test only models a deterministic synthetic failure. It does not prove safe handling of an uncertain provider initiation outcome.

**Required correction:** distinguish definitive initiation rejection from uncertain initiation outcome. Uncertain outcomes must keep the reservation in a reconciliation-safe state, persist an initiation attempt/outbox record, and release only after provider-status reconciliation or an authorized expiry process.

### 2. Late provider success is ignored after payment expiry — HIGH

`settlePayment()` performs this order:

1. Lock payment.
2. If `expires_at` passed, mark `EXPIRED` and release reservation.
3. Only then call `gateway.checkTransactionStatus()`.

Therefore a late `SUCCESS` callback is never verified. The disposable probe showed:

```json
{
  "result": {"settled": false, "status": "EXPIRED"},
  "provider_transaction_id": null,
  "reconciliation_events": 0,
  "notifications": 1
}
```

The provider transaction identity was not persisted and no `SETTLEMENT_RECONCILIATION_REQUIRED` event was written. A later payment can reserve the cycle while the earlier provider session may have collected funds.

**Required correction:** before expiry terminalization, query provider status. If provider reports success, mark settlement reconciliation required and retain evidence; do not silently discard the payment/session.

### 3. Generic terminal transitions can release live provider-session reservations — HIGH

`transitionPayment()` permits:

- `PENDING -> FAILED/CANCELLED/EXPIRED`
- `PROCESSING -> FAILED/CANCELLED/EXPIRED`
- `VERIFICATION_REQUIRED -> FAILED/CANCELLED/EXPIRED`

Each calls `releaseReservations()`.

This means an internal actor can release a member/cycle reservation without provider status verification. If a checkout session is externally active, the member can start a second payment while the first remains collectible.

**Required correction:** split lifecycle transitions into:

- local-only terminal transitions when no provider session exists;
- provider-verified terminal transitions;
- reconciliation-required transitions for uncertain provider state.

Generic transitions should not release reservations for payments with an initiated provider session unless the provider has confirmed terminal/no-session state or an approved reconciliation rule applies.

### 4. `PENDING_PROVIDER` refund requests can become permanently stuck — HIGH

Refund claim logic permits retry only from `REQUESTED` or `RECONCILIATION_REQUIRED`:

```sql
UPDATE payment_refund_requests
SET status='PENDING_PROVIDER'
WHERE id=? AND status IN ('REQUESTED','RECONCILIATION_REQUIRED')
```

If a process crashes after claim, initiation, or provider confirmation but before the status advances, the request remains `PENDING_PROVIDER`. A retry is rejected as “already being processed.”

If a provider refund reference exists, the safe retry should verify that reference rather than initiate again. If it does not, the request should transition to `RECONCILIATION_REQUIRED`, not remain locked forever.

**Required correction:** add bounded lease/stale-claim recovery:

- `PENDING_PROVIDER` with expired lease and provider reference -> verify reference, do not initiate.
- `PENDING_PROVIDER` with expired lease and no provider reference -> `RECONCILIATION_REQUIRED`; never blindly initiate.
- Preserve at-most-once provider execution.

### 5. Provider verification inside DB transaction — MEDIUM

`settlePayment()` calls `gateway.checkTransactionStatus()` while a DB transaction and `FOR UPDATE` payment lock are held. This is not a correctness bypass, but a slow gateway increases lock contention and deadlock risk.

**Recommended correction:** use a verification-evidence phase outside the critical transaction or use short, bounded locks after obtaining verified provider evidence.

## Reservation lifecycle review

| Lifecycle scenario | Result |
|---|---|
| Reservation creation | PASS |
| Competing reservation attempts | PASS — unique member/cycle reservation, tested in separate processes |
| Reservation expiry | PASS for takeover of expired reservation |
| Failed gateway initiation | PARTIAL — deterministic failure releases correctly, uncertain timeout/unknown outcome is unsafe |
| Successful gateway initiation | PASS |
| Gateway timeout | FAIL/BLOCKED — no distinction between failure and uncertain provider-created session |
| Unknown initiation outcome | FAIL — treated as safe `FAILED` and reservation released |
| Reservation release | PASS for verified terminal/failed paths |
| Settlement after reservation expiry | PARTIAL — reservation-expiry branch writes reconciliation event, but payment `expires_at` bypasses provider verification |
| Late provider confirmation | FAIL — payment expiry ignores successful provider result |
| Refund-related reservation release | PASS |
| Legitimate repayment after refund | PASS |

## Refund workflow review

| Scenario | Result |
|---|---|
| Durable refund request | PASS |
| Atomic outbox claim | PASS |
| Provider refund initiation outside DB lock | PASS |
| Provider refund verification | PASS |
| Provider-confirmed/local DB failure recovery | PASS — retry completes locally without second initiation |
| `RECONCILIATION_REQUIRED` without provider ref | PASS — does not blindly initiate again |
| Stale `PENDING_PROVIDER` recovery | FAIL — can remain permanently processing |
| Concurrent refund requests | PASS after non-destructive claim conflict handling |
| Duplicate refund | PASS — `REFUNDING`/`REFUNDED` states and unique request key prevent duplicates |
| Allocation-specific reversal | PASS |
| Preservation of unrelated paid cycles | PASS |
| Provider-specific uncertain refund result | BLOCKED — actual provider reconciliation contract unavailable |

## Authorization and provider-boundary review

| Control | Status |
|---|---|
| Authenticated acting user required | PASS |
| Member impersonation rejected | PASS |
| Unapproved member rejected | PASS |
| Settlement provider derived from locked payment | PASS |
| Notification provider matched to stored payment | PASS |
| Provider transaction ID required | PASS |
| Duplicate transaction IDs rejected | PASS |
| Provider event ID required and deduplicated | PASS |
| Gateway registry replacement prevented | PASS |
| Test gateway forbidden in production | PASS |
| Generic refund transition forbidden | PASS |
| Generic terminal lifecycle transitions authorized only after provider reconciliation | FAIL |

## Membership and audit integrity

- Membership type is preserved through `membership_type`/`user_category`: **PARTIAL** — implemented, but organization-specific fixture coverage is incomplete.
- Membership number uses `membership_sequence` with `FOR UPDATE`: **PASS/PARTIAL** — implementation is transaction-safe for existing sequence rows; first-row creation under concurrent processes should be reviewed.
- Projection sums only active canonical entitlements: **PASS**.
- Refund/repayment projection is consistent in tested scenarios: **PASS**.
- `payment_audit_events.actor_id` has a users FK: **PASS**.
- `event_data` makes key actions reconstructable: **PARTIAL** — useful structured data exists, but no immutable external audit sink.

## Database integrity assessment

### PASS

- `DECIMAL(12,2)` financial amounts.
- `CHAR(3)` currency.
- Payment, allocation, entitlement, notification, refund and audit PK/FK structure.
- Unique payment reference, member idempotency, provider reference, provider transaction ID, member-cycle entitlement and reservation.
- Refund request and provider refund reference uniqueness.
- `REFUNDING` allocation state separates request persistence from completion.
- Disposable migration `004` is conditional/repeatable for audit actor FK.

### PARTIAL

- `payment_notifications.provider_code` is nullable; legacy rows may weaken provider-event deduplication until backfilled.
- `cycle_payment_status` still lacks `(user_id,cycle_year)` uniqueness; canonical reservations mitigate but do not repair legacy schema.
- Migration `003` uses `ADD INDEX IF NOT EXISTS`, which is acceptable in the tested MariaDB environment but should be revalidated before production-style migration.

## Outstanding partial findings and acceptance impact

| Finding | Acceptance impact |
|---|---|
| Legacy `cycle_payment_status` uniqueness | Does not block core canonical foundation if canonical reservation/entitlement remains authoritative; blocks production migration until reconciled |
| Manual refund evidence storage | Does not block disposable foundation; blocks operational production workflow until approved storage exists |
| External immutable audit sink | Does not block core DB integrity; should block enterprise/production audit assurance if required |
| Organization projection coverage | Does not reject the core defect remediation, but should be tested before integration acceptance |
| Provider callback/refund reconciliation | Blocks provider integration and any claim of production readiness |
| Uncertain gateway initiation handling | **Blocks Phase 1B acceptance** because it can enable duplicate externally funded sessions |
| Late provider confirmation after expiry | **Blocks Phase 1B acceptance** |
| Stale `PENDING_PROVIDER` refunds | **Blocks Phase 1B acceptance** |

## Required corrections before re-review

1. Add an initiation-attempt/outbox state that distinguishes definitive failure from uncertain provider outcome.
2. Do not release reservations on ambiguous initiation timeout/crash until provider reconciliation resolves the session.
3. Query provider status before honoring payment `expires_at`; late `SUCCESS` must produce reconciliation evidence, not silent expiry.
4. Restrict reservation release for `PROCESSING`/`VERIFICATION_REQUIRED` payments to verified terminal provider outcomes or explicit reconciliation.
5. Add stale `PENDING_PROVIDER` lease/recovery rules for refund requests.
6. Consider moving provider settlement status calls outside long DB lock windows.
7. Add tests for gateway timeout/unknown initiation, late provider success, stale refund leases, reservation takeover, and post-crash recovery.

## Final decision

**REJECTED**

Phase 1B is substantially improved over rejected Phase 1A, but remaining lifecycle paths can still lead to duplicate externally funded sessions, discarded late successful payments, or permanently blocked refund operations. Live payments remain correctly disabled. `next_auth` remains untouched. AzamPay remains blocked pending official documentation and credentials.
