# Phase 1A Payment Test Results

Date: 2026-11-02  
Database: disposable `phase1a_test` only. `next_auth` was not migrated or modified.

## Security boundary findings fixed

### Settlement authorization vulnerability

The expanded validation test initially showed that the generic `transitionPayment()` helper accepted `PROCESSING -> SUCCESS`. That allowed internal callers to bypass authoritative gateway settlement even though the public unsafe routes remained disabled.

Correction:

- Removed `SUCCESS` from every generic transition map entry.
- `SUCCESS` is now written only inside `settlePayment()` after provider status, provider reference, member reference, amount, currency, state, and idempotency checks.
- Test now proves an actor named `admin` cannot call `transitionPayment(..., 'SUCCESS')` either.

### Test gateway production bypass

`TestPaymentGateway` was previously selectable whenever code registered it. `registerGateway()` now rejects `test-gateway` when `NODE_ENV=production`; the disposable test proves this.

## Focused disposable suite

Command:

```bash
PHASE1A_TEST_DB=1 MYSQL_DATABASE=phase1a_test \
node --test tests/payment-foundation.test.mjs \
  tests/payment-concurrency.test.mjs \
  tests/payment-validation.test.mjs
```

Final result:

```text
tests 3
pass 3
fail 0
skipped 0
```

### Foundation test coverage

- Verifies `SELECT DATABASE() = 'phase1a_test'` before writes.
- Creates a synthetic member and uses a synthetic admin.
- Combined payment for 2026, 2027 and 2028.
- Amounts are produced by `listFutureUnpaidCycles()` in `lib/enhancedMembershipCycles.ts`:
  - first current-cycle amount for a new regular user: 40,000
  - two future renewal-priced cycles: 30,000 each
  - total: 100,000
- Creates exactly three allocations.
- Concurrent duplicate notification produces no duplicate effects.
- Provider transaction ID is persisted.
- Entitlements become `active` once.
- Invalid allocation, excessive refund, unauthorized actor, missing manual approval, and unconfirmed provider refund are rejected.
- Provider refund confirmation failure leaves zero refund rows.
- Confirmed provider refund reverses only 2026; 2027/2028 remain active.
- Duplicate refund is rejected.
- Successful manual refund records approval reference, evidence hash, confirmed timestamp, actor type, actor ID and audit timestamp.
- Only the intended second entitlement is reversed.

### Multi-process test coverage

Uses separate Node child processes, each with its own database pool:

- Two concurrent `settlePayment()` calls for the same payment.
- Two concurrent refunds for the same allocation.
- Two notifications with the same provider event ID.
- Two notifications with different provider event IDs.

Verified final state:

- Exactly one settlement effect.
- Exactly one entitlement for the funded cycle.
- Exactly one notification row for the same event ID.
- Exactly one refund row for one allocation.
- Duplicate attempts fail closed or return duplicate status without financial effects.
- All processes exit cleanly.

### Validation/rollback coverage

- Wrong currency rejected.
- Wrong member reference rejected.
- Wrong provider reference rejected.
- Unknown payment rejected.
- Invalid direct transition rejected.
- Direct admin `PROCESSING -> SUCCESS` rejected.
- Expired payment transitions to `EXPIRED` without activation.
- Duplicate provider transaction ID rejected by unique constraint.
- Rejected settlement leaves payment `PROCESSING`, allocation `ALLOCATED`, and no entitlement.
- Settlement followed by simulated application failure before notification insert is retry-safe: retry returns duplicate and does not create a second entitlement.
- Test gateway registration throws when `NODE_ENV=production`.

## Standard and quality checks

| Check | Actual result |
|---|---|
| `npm test` | PASS — 9 tests: 6 pass, 3 gated skips, 0 fail |
| Focused disposable tests | PASS — 3/3 |
| Focused ESLint (`lib/payments`, Phase 1A tests) | PASS — 0 errors/warnings |
| Focused TypeScript (`lib/payments`, Phase 1A tests) | PASS |
| `npm run build` | PASS — but Next.js skips type validation |
| `git diff --check` | PASS |
| Repository `npx tsc --noEmit` | FAIL — 340 lines; remaining pre-existing route/helper errors. No new payment-file errors after `allowImportingTsExtensions` was added |
| Repository `npm run lint` | FAIL — 673 problems: 451 errors, 222 warnings; pre-existing broad quality debt |
