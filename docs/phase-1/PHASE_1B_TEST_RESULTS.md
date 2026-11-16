# Phase 1B Test Results

Date: 2026-11-02  
Database: disposable `phase1a_test` only.

## Focused disposable suite

Command:

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
duration_ms 2045.5846
```

### `payment-foundation.test.mjs`

Verified:

- three-cycle combined allocation;
- duplicate concurrent notification;
- provider transaction ID persistence;
- active entitlements;
- unauthorized and malformed refund requests;
- unconfirmed provider refund produces no refund row;
- persisted provider-confirmed request can complete locally after simulated local failure;
- exactly one provider refund initiation after recovery;
- refund request reaches `COMPLETED` with provider reference and timestamps;
- allocation-specific reversal;
- unrelated paid cycles remain active;
- manual refund actor, approval, evidence hash and audit timestamp.

### `payment-concurrency.test.mjs`

Uses separate Node worker processes and independent database connections.

Verified:

- two competing intents for same member/cycle: exactly one succeeds;
- winner settles once;
- losing settlement cannot use a missing/replaced reservation;
- two simultaneous settlement attempts produce one `SUCCESS` and one duplicate;
- two simultaneous refund attempts produce one refund and one rejection;
- same provider event ID creates one notification row;
- different event IDs do not create duplicate financial effects;
- final entitlement/refund state is consistent.

### `payment-validation.test.mjs`

Verified:

- wrong currency rejection;
- wrong member reference rejection;
- wrong provider reference rejection;
- unknown payment rejection;
- generic `PROCESSING -> SUCCESS` rejection;
- generic `SUCCESS -> REFUNDED` rejection;
- expired payment handling;
- missing provider transaction identity rejection;
- duplicate provider transaction ID rollback;
- notification retry after post-settlement crash;
- member impersonation rejection;
- unapproved member rejection;
- competing reservation rejection;
- failed payment releases reservation and permits retry;
- expired reservation permits takeover;
- old payment cannot settle after reservation takeover;
- gateway initiation failure leaves reservation `RELEASED`;
- missing provider event ID rejection;
- wrong provider reference/payment binding rejection;
- test gateway remains forbidden in production.

## Standard tests

Command: `npm test`

Actual result:

```text
tests 9
pass 6
skipped 3
fail 0
```

The three disposable payment tests are correctly skipped without `PHASE1A_TEST_DB=1`.

## Focused quality checks

- `npx eslint lib/payments/... tests/payment-*.mjs tests/phase1a-worker.mjs`: PASS
- `npx tsc ... lib/payments/types.ts lib/payments/gateways.ts lib/payments/service.ts`: PASS
- `npm run build`: PASS, with existing type-validation skip warning
- `git diff --check`: PASS

## Repository-wide checks

- `npx tsc --noEmit --pretty false`: FAIL, exit 2, 340 output lines; errors remain pre-existing (not in Phase 1B payment files)
- `npm run lint`: FAIL, exit 1, 673 problems (451 errors, 222 warnings), pre-existing repository debt

## Reproduction of corrected defect

Before remediation, independent review reproduced two successful payments for one member/cycle. After remediation, multi-process verification shows only one active reservation owner can settle; competing intent creation or settlement is rejected and reconciliation-required audit evidence is written when appropriate.
