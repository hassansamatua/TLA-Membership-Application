# Phase 1C Test Results

Date: 2026-11-02

## Focused disposable payment suite

Command:

```bash
PHASE1A_TEST_DB=1 MYSQL_DATABASE=phase1a_test \
node --test tests/payment-foundation.test.mjs \
  tests/payment-concurrency.test.mjs \
  tests/payment-validation.test.mjs \
  tests/payment-lifecycle.test.mjs
```

Actual final result:

```text
tests 4
pass 4
fail 0
cancelled 0
skipped 0
duration_ms 2648.0153
```

## Scenario coverage

### Phase 1A/1B protections still passing

- Exclusive member-cycle reservation.
- Separate-process competing intents: exactly one succeeds.
- Simultaneous settlements: exactly one settlement effect.
- Provider-bound settlement.
- Authenticated initiation.
- Member impersonation rejection.
- Unapproved member rejection.
- Mandatory provider transaction ID.
- Duplicate provider transaction ID prevention.
- Generic `PROCESSING -> SUCCESS` rejection.
- Generic `SUCCESS -> REFUNDED` rejection.
- Allocation-level refund authorization and reversal.
- Combined and separate cycle payment.
- Repayment after refund.
- Provider event ID requirement and deduplication.
- Test gateway disposable/production restrictions.

### Phase 1C lifecycle coverage

- Definite gateway initiation rejection.
- Timeout before provider acceptance.
- Timeout after provider may have accepted.
- Simulated crash after provider initiation.
- Initiation reconciliation through `checkInitiation()`.
- No duplicate payable session after uncertain initiation.
- Late provider success while reservation remains valid.
- Late provider success after reservation expiry.
- Late provider success after another payment funds the cycle.
- `PENDING`, `PROCESSING` and `VERIFICATION_REQUIRED` reject generic `FAILED`, `CANCELLED`, `EXPIRED` and `REFUNDED` transitions.
- Stale verification race: reservation released between provider status lookup and settlement lock produces `RECONCILIATION_REQUIRED`.
- Duplicate provider transaction records reconciliation rather than unique-key rollback.
- Stale refund claim recovery without another external refund.
- Provider-confirmed refund local recovery without another external call.
- Uncertain refund outcome without blind retry.
- Concurrent refund recovery in independent processes.

## Standard tests

`npm test` actual result:

```text
tests 10
pass 6
skipped 4
fail 0
duration_ms 371.7147
```

The four DB tests correctly skip without `PHASE1A_TEST_DB=1`.

## Focused checks

- Focused TypeScript: PASS
- Focused ESLint: PASS
- Production build: PASS
- `git diff --check`: PASS

## Repository-wide checks

- `npx tsc --noEmit --pretty false`: FAIL, exit 2, 340 lines, dominated by pre-existing `lib/db-utils.ts` and generated route/type errors; no `lib/payments` or Phase 1C test errors reported.
- `npm run lint`: FAIL, exit 1, 673 problems (451 errors, 222 warnings), consistent with the existing baseline after removing the temporary new warning.

## Fixture corrections made during verification

- Corrected released-reservation test lookup to query by member because release clears `payment_id`.
- Corrected stale refund fixture parameter count.
- Updated duplicate provider transaction assertion from raw SQL `Duplicate entry` to explicit `Duplicate provider transaction identity` plus `RECONCILIATION_REQUIRED` evidence.

These were test/documentation corrections, not changes intended to weaken assertions.

## Implementation corrections discovered by testing/review

- Restricted stale initiation retry so `PENDING_PROVIDER` cannot blindly invoke `initiatePayment()` again.
- Allowed `REQUESTED` and reconcilable initiation states to be claimed by reconciliation.
- Prevented provider lookup failure from downgrading `RECONCILIATION_REQUIRED` to `VERIFICATION_REQUIRED`.
- Stored duplicate provider transaction identity in reconciliation evidence without assigning it to the second payment row.
