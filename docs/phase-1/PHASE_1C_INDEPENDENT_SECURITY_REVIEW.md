# Phase 1C Independent Security and Financial-Integrity Review

Date: 2026-11-02  
Review type: fresh review-only assessment of the completed Phase 1C implementation.  
Database scope: disposable `phase1a_test` only. `next_auth` was checked read-only and remains unchanged.

## Executive assessment

**Final decision: ACCEPTED WITH CONDITIONS**

The reviewed Phase 1C implementation corrects the critical/high financial-integrity defects that caused Phase 1A and Phase 1B to be rejected:

- Uncertain payment initiation is no longer treated as proof of provider rejection.
- Payment expiry no longer suppresses provider verification before terminalization.
- Generic transitions can no longer release potentially payable reservations or create financial states.
- Stale refund claims can now be recovered without blindly repeating provider calls.
- Late provider `SUCCESS` is preserved in reconciliation evidence instead of disappearing from the ledger.
- Settlement revalidates payment identity, provider binding, reservation ownership and cycle funding inside a short transaction.

No new CRITICAL or HIGH defect was confirmed in the disposable implementation. Acceptance is conditional because provider-specific behavior remains unverified, no lease sweeper/reconciliation workflow exists, and live payment routes are still intentionally disabled.

This is acceptance of the **canonical, disposable payment foundation only**—not acceptance for sandbox credentials, production deployment or AzamPay integration.

## Files inspected

- `docs/phase-1/PHASE_1A_INDEPENDENT_CODE_REVIEW.md`
- `docs/phase-1/PHASE_1B_INDEPENDENT_SECURITY_REVIEW.md`
- `docs/phase-1/PHASE_1C_*.md`
- `lib/payments/types.ts`
- `lib/payments/gateways.ts`
- `lib/payments/service.ts`
- `lib/enhancedMembershipCycles.ts`
- `migrations/phase1a/001_member_schema_alignment.sql`
- `migrations/phase1a/002_payment_foundation.sql`
- `migrations/phase1a/003_payment_integrity_remediation.sql`
- `migrations/phase1a/004_audit_actor_integrity.sql`
- `migrations/phase1a/005_payment_lifecycle_recovery.sql`
- `tests/payment-foundation.test.mjs`
- `tests/payment-concurrency.test.mjs`
- `tests/payment-validation.test.mjs`
- `tests/payment-lifecycle.test.mjs`
- `tests/phase1a-worker.mjs`
- `package.json`
- `tsconfig.json`

## Historical finding verification

### Phase 1A findings

| Finding | Verification | Status |
|---|---|---|
| CRITICAL: duplicate cycle funding | Unique member-cycle reservation, locked reservation ownership and active-entitlement recheck prevent duplicate local funding | PASS |
| CRITICAL: generic refund transition bypass | `REFUNDED` and `SUCCESS` are absent from generic transition targets | PASS |
| HIGH: caller-selected provider | Settlement uses locked `payment.provider_code` | PASS |
| HIGH: arbitrary member initiation | `actingUserId`, approval check and impersonation rejection implemented | PASS |
| HIGH: optional transaction identity | Missing `providerTransactionId` rejected/reconciled; duplicate identity prevented | PASS |
| HIGH: provider refund inside DB transaction | Provider calls execute outside the refund completion transaction | PASS |
| MEDIUM findings | Most corrected; evidence storage, audit sink, legacy uniqueness and organization fixture remain partial | PARTIAL |

### Phase 1B findings

| Finding | Verification | Status |
|---|---|---|
| HIGH: uncertain initiation released reservation | Durable initiation attempt/outbox and `OUTCOME_UNKNOWN` preserve reservation | PASS |
| HIGH: late provider `SUCCESS` ignored | Provider status is checked before expiry; late success records reconciliation evidence | PASS |
| HIGH: generic terminal transitions released reservations | Generic transitions cannot produce terminal states or release reservations | PASS |
| HIGH: stale `PENDING_PROVIDER` refund stuck | Lease owner/expiry and safe recovery implemented | PASS |
| MEDIUM: provider verification inside long DB transaction | Provider call moved outside transaction; lock-time revalidation added | PASS |

## Payment initiation recovery assessment

The implementation now creates `payment_initiation_attempts` before provider execution and uniquely binds one attempt to a payment.

Verified behavior:

- `REQUESTED` is atomically claimed to `PENDING_PROVIDER`.
- `claim_owner`, `claimed_at`, `lease_expires_at`, `retry_count`, `last_operation`, `last_error` and `provider_outcome` are persisted.
- Explicit `definiteRejection` becomes `DEFINITE_REJECTION`, marks payment `FAILED` and releases reservations.
- Generic timeout/application errors become `OUTCOME_UNKNOWN`, payment `VERIFICATION_REQUIRED`, reservation `ACTIVE`.
- Stale `PENDING_PROVIDER` does not call `initiatePayment()` again.
- `reconcilePaymentInitiation()` uses `checkInitiation()` when available.
- If initiation lookup is unavailable, the payment becomes `RECONCILIATION_REQUIRED` with an open reconciliation case.
- A timeout after provider acceptance is recovered through lookup rather than creating a second payable session.
- Competing new intents are blocked while the reservation remains active; expired uncertain reservations require reconciliation rather than silent takeover.

### Remaining initiation concern

**MEDIUM — initiation reconciliation claim is not fully atomic.** The reconciliation claim updates `claim_owner` and lease fields but does not always change `status` to a unique in-flight state. Two workers may therefore perform concurrent provider `checkInitiation()` calls. This is a lookup call rather than a second payable session, so it is not a critical funding defect, but a stronger `RECONCILING` state would be preferable.

## Late provider confirmation assessment

Late `SUCCESS` handling was independently traced:

1. Provider status is fetched before expiry terminalization.
2. If local expiry exists and provider reports `PENDING`, payment enters `RECONCILIATION_REQUIRED`.
3. If provider reports `SUCCESS`:
   - valid, exclusively owned active reservation may settle normally;
   - expired/replaced/missing reservation creates `LATE_PROVIDER_SUCCESS` reconciliation;
   - provider transaction ID and evidence are persisted;
   - no entitlement is activated for a replaced/funded cycle.
4. If provider reports a verified terminal state, reservations can be released.
5. If provider lookup fails for expired/reconciling payments, `RECONCILIATION_REQUIRED` is preserved.

Test evidence confirms both valid-reservation late settlement and replaced/funded-cycle reconciliation.

## Settlement authorization and concurrency

- Provider verification now occurs outside the long transaction.
- A second transaction locks the payment and revalidates provider code, reference, amount, currency and payment state.
- A stale-verification race that releases reservation ownership between provider lookup and settlement lock produces `RECONCILIATION_REQUIRED`, not entitlement.
- Allocations and reservations are locked before entitlement changes.
- Existing active entitlements cannot be overwritten.
- A reversed entitlement may be reactivated only through a new verified payment.
- Duplicate provider transaction IDs create reconciliation evidence rather than second funding.
- Independent-process tests confirm only one competing intent/settlement funds a cycle.
- Rollback leaves allocations un-paid and entitlements absent.

## Refund recovery assessment

The refund request lifecycle now has claim ownership and lease expiry:

- `REQUESTED` can be claimed.
- `PENDING_PROVIDER` with an active lease is protected from concurrent workers.
- Stale `PENDING_PROVIDER` with a provider reference verifies that reference only.
- Stale `PENDING_PROVIDER` without a reference becomes `RECONCILIATION_REQUIRED` and cannot blindly retry.
- `RECONCILIATION_REQUIRED` with a provider reference can verify the existing reference.
- `PROVIDER_CONFIRMED` can complete local records without another external refund.
- `COMPLETED` is terminal.

A simulated crash boundary during provider refund execution was represented by a stale request carrying an existing provider refund reference. Recovery verified the reference and completed locally without calling `initiateRefund()` again. A provider call that yields no reference is forced into reconciliation rather than blind retry.

Refund authorization, allocation-specific reversal, unrelated-cycle preservation and original payment preservation remain correct.

### Remaining refund concern

**MEDIUM — refund lease operations are not individually audited.** `payment_audit_events` records request and confirmation, while lease claim/recovery history exists mainly in `payment_refund_requests` fields. This is sufficient for disposable forensic review but weaker than a complete append-only audit trail for production.

## Generic transition and reservation protection

`transitionPayment()` now permits only:

- `PENDING -> PROCESSING`
- `PROCESSING -> VERIFICATION_REQUIRED`

It cannot:

- produce `SUCCESS`;
- produce `REFUNDED`;
- mark payment `FAILED`, `CANCELLED` or `EXPIRED`;
- release reservations;
- abandon a potentially payable provider session.

Reservation release paths were inspected:

- provider-verified terminal settlement;
- definite initiation rejection;
- provider-verified terminal initiation reconciliation;
- refund completion;
- expired reservation takeover only after linked payment is already terminal.

No unauthorized generic release path was found.

## Outstanding medium findings

| Finding | Impact | Core foundation | Sandbox | Production | Required action |
|---|---|---|---|---|---|
| No lease sweeper | Stale leases recover when invoked but are not automatically processed | Does not block | Should be resolved before unattended sandbox | Blocks unattended production | Add worker/sweeper |
| No reconciliation workflow | Cases persist but cannot be operationally resolved | Does not block | Blocks real provider sandbox | Blocks production | Add admin workflow |
| `cycle_payment_status` lacks uniqueness | Canonical reservation/entitlement protects new flow | Does not block | Should be fixed before provider sandbox | Blocks production migration | Add data reconciliation + constraint |
| Evidence hash only | Manual refunds are auditable but evidence retrieval undefined | Does not block | Should be resolved | Blocks production manual refunds | Define controlled evidence store |
| No external immutable audit | DB audit is structured but mutable | Does not block | Recommended | Blocks high-assurance production | Add append-only/external sink |

## Database integrity assessment

Disposable schema inspection confirms:

- unique payment reference and member idempotency;
- unique provider reference and provider transaction identity;
- unique payment-cycle allocation;
- unique member-cycle entitlement;
- unique member-cycle reservation;
- unique refund request and provider refund reference;
- unique initiation attempt per payment;
- unique reconciliation case per payment/type;
- financial amounts use `DECIMAL(12,2)`;
- currency uses `CHAR(3)`;
- initiation, refund and reconciliation tables have required foreign keys;
- audit actor foreign-key constraint exists;
- payment status enum includes `RECONCILIATION_REQUIRED`;
- refund lease columns and indexes exist.

Migration repeatability is acceptable in the tested MariaDB environment. `IF NOT EXISTS` behavior should still be validated before any future staging migration.

`next_auth` remains unchanged.

## Independent test evidence

### Focused disposable suite

Executed:

```bash
PHASE1A_TEST_DB=1 MYSQL_DATABASE=phase1a_test \
node --test tests/payment-foundation.test.mjs \
  tests/payment-concurrency.test.mjs \
  tests/payment-validation.test.mjs \
  tests/payment-lifecycle.test.mjs
```

Actual result:

```text
tests 4
pass 4
fail 0
skipped 0
duration_ms 2610.5563
```

### Standard tests

`npm test` result:

```text
tests 10
pass 6
skipped 4
fail 0
duration_ms 346.4056
```

### Focused checks

- Focused TypeScript: PASS
- Focused ESLint: PASS
- Production build: PASS
- `git diff --check`: PASS

### Repository-wide checks

- Repository TypeScript: FAIL — 340 lines of pre-existing errors, primarily `lib/db-utils.ts` and generated route types.
- Repository ESLint: FAIL — 673 problems (451 errors, 222 warnings), matching the prior baseline after the temporary new warning was removed.

## Required corrections

No blocking CRITICAL or HIGH correction is required before another staged review gate.

Recommended non-blocking corrections:

1. Make initiation reconciliation claims use a distinct `RECONCILING` state or equivalent atomic status transition.
2. Audit each stale lease claim/recovery and reconciliation-case transition.
3. Add a bounded sweeper for expired initiation/refund leases.
4. Add an authorized reconciliation-case resolution workflow.
5. Reconcile and constrain legacy `cycle_payment_status` before production migration.

## Production limitations

- No live provider was integrated or verified.
- AzamPay remains blocked without official documentation and sandbox credentials.
- Synthetic gateway tests do not prove provider timeout, idempotency or callback behavior.
- Live payment endpoints remain disabled.
- `next_auth` and staging data have not been migrated.
- Provider-specific refund and initiation uncertainty remain reconciliation-dependent.

## Final decision

**ACCEPTED WITH CONDITIONS**

The core canonical payment foundation in the disposable database now satisfies the required financial-integrity controls at review scope. Sandbox integration should remain blocked until provider-specific initiation/refund semantics and an operational reconciliation path are verified. Production readiness remains blocked pending provider documentation, migrations, endpoint authorization, operational sweepers and broader repository remediation.
