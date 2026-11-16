# Phase 1F Test Results

Date: 2026-11-06

Status: disposable verification passed; repository baseline failures remain. **This report makes no acceptance decision.**

Database: existing disposable `phase1a_test` on MariaDB `10.4.32-MariaDB`.

## Actual execution results

| Check | Actual result |
|---|---|
| Expanded `tests/payment-operations.test.mjs` | Exit 0; 1 test, 1 pass, 0 fail; 2642.3475 ms |
| Five sequential disposable suites with `--test-concurrency=1` | Exit 0; 5 tests, 5 pass, 0 fail, 0 skipped; 7046.7234 ms |
| Isolated `tests/payment-concurrency.test.mjs` | Exit 0; 1 test, 1 pass, 0 fail; 2362.2484 ms |
| `npm test` | Exit 0; 11 tests, 6 pass, 5 expected disposable skips, 0 fail; 449.0466 ms |
| Focused TypeScript on payment service/gateway | Exit 0 |
| Focused ESLint on payment service/tests/worker | Exit 0 |
| `npx tsc --noEmit --pretty false` | Exit 2; 340 diagnostic lines |
| `npm run lint` | Exit 1; 673 problems: 451 errors, 222 warnings |
| `npm run build` | Exit 0; 144 pages generated; type validation skipped |
| `git diff --check` | Exit 0 |

An earlier invocation of all five disposable files without `--test-concurrency=1` used the default parallel scheduler and failed two suites through shared-database interference. That result is not evidence of a payment-state regression; the required sequential execution passed cleanly.

## Race coverage added/verified

### Original initiation request

- Delayed definite rejection after authenticated recovery and successful settlement returned `STALE_CLAIM`.
- Delayed provider acceptance after authenticated recovery and successful settlement returned `STALE_CLAIM`.
- Delayed `OUTCOME_UNKNOWN` after authenticated recovery and successful settlement returned `STALE_CLAIM`.
- In each case the payment remained `SUCCESS`, the attempt remained `PROVIDER_ACCEPTED`, and the entitlement remained `active`.
- Audit assertions confirmed `PAYMENT_SUCCESS` existed and no `PAYMENT_FAILED` or stale verification transition was created.

### Recovery worker authorization

- `reconcilePaymentInitiation` was called directly with missing and wrong credentials and rejected.
- Existing refund recovery without worker credentials was rejected.
- Existing refund recovery with wrong worker credentials was rejected.
- Worker audit records use `actor_type='recovery_worker'` and the authenticated `payment_recovery_workers.id`; the worker identity remains distinct from the refund requester.

### Stored refund request authority

A worker called an existing request with forged allocation IDs, amount, reason, and actor identity. The completed refund used the stored allocation ID, stored amount, stored reason, and original requester ID. No forged value was persisted.

### Refund audit rollback

A trigger on `REFUND_CONFIRMED` caused completion to fail. Verification showed:

- request remained `PROVIDER_CONFIRMED`;
- stored request fields remained unchanged;
- no `payment_refunds` row existed;
- entitlement remained `active`.

After the trigger was removed, a second authenticated worker-owned claim completed the stored operation successfully.

## Migration verification

`007_phase1e_remediation.sql` was executed twice against the existing disposable schema:

- reconciliation cases before/after: 326/326;
- evidence-history entries before/after: 239/239;
- recovery workers before/after: 27/27.

An insert with a nonexistent `parent_case_id` was rejected by `fk_reconciliation_parent`. No rollback migration exists; corrections must use a forward-only migration policy.

## Repository limitations

- Repository TypeScript remains failed with 340 diagnostic lines.
- Repository ESLint remains failed with 451 errors and 222 warnings.
- Production build passes but explicitly skips type validation.
- Disposable suites sharing `phase1a_test` require sequential execution.
- No deployed scheduler/worker, credential-rotation lifecycle, immutable external audit sink, or real provider semantics exist.
