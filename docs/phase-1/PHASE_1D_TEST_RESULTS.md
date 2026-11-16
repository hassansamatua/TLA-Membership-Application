# Phase 1D Test Results

Date: 2026-11-04

Status: disposable verification passed; repository-wide failures remain. No independent acceptance decision.

The application connection target was verified as `phase1a_test` without printing credentials. The existing database was not recreated, dropped, reset, or overwritten.

## Actual execution evidence

| Check | Result |
| --- | --- |
| `node --experimental-strip-types --test tests/payment-operations.test.mjs` | Exit 0; 1 test, 1 pass; 1334.2898 ms after initial correction, then 2010.9478 ms after expanded coverage |
| `node --experimental-strip-types --test --test-concurrency=1 tests/payment-foundation.test.mjs tests/payment-concurrency.test.mjs tests/payment-validation.test.mjs tests/payment-lifecycle.test.mjs tests/payment-operations.test.mjs` | Exit 0; 5 tests, 5 pass, 0 fail, 0 skipped; duration 6119.5196 ms |
| Isolated `tests/payment-concurrency.test.mjs` | Exit 0; 1 pass; duration 2194.5162 ms |
| `npm test` | Exit 0; 11 tests, 6 pass, 5 skipped, 0 fail; duration 416.7785 ms |
| Focused TypeScript on `lib/payments/service.ts` and `lib/payments/gateways.ts` | Exit 0 |
| Focused ESLint on payment service/tests/worker | Exit 0 |
| `npx tsc --noEmit --pretty false` | Exit 2; 340 lines of generated route/legacy API/auth/component/`db-utils` errors |
| `npm run lint` | Exit 1; 673 problems: 451 errors, 222 warnings |
| `npm run build` | Exit 0; compiled in 15.1s and generated 144 pages; configuration skips type validation |
| `git diff --check` | Exit 0 |

Standard `npm test` skips the five disposable payment suites when `PHASE1A_TEST_DB` is not set; those skips are expected.

## Disposable execution note

An initial parallel-file run reported 4 pass/1 fail because the disposable suites share `phase1a_test` and Node executes test files concurrently by default. The concurrency suite passed in isolation and all five passed under `--test-concurrency=1`. This is test scheduling/shared-fixture interference, not an implementation failure; it should be corrected in future test infrastructure.

## Covered Phase 1D behaviors

1. Expired administrator claims rejected for resolution and escalation.
2. Reclaimed ownership immediately invalidated the prior administrator.
3. Escalation released owner/worker/lease atomically and retained escalation history.
4. Active escalated claim rejected takeover.
5. Released and expired escalated cases were reclaimable.
6. Claim/renewal/escalation state and audit were transactional.
7. Disposable audit-trigger failure rolled back associated state and audit writes.
8. Initial `LEASE_CLAIMED` and later `LEASE_RENEWED` were distinguished by exact request ID.
9. Repeated refund reconciliation preserved the first financial subject.
10. Unscoped bounded mixed work succeeded for the valid item, retained the invalid item for backoff, recorded failure evidence, and concurrent workers did not duplicate recovery.
11. Deferred `PROVIDER_CONFIRMED` refund work did not execute before its retry time.
12. Refund-only scoped sweeps did not process unrelated initiation work.
13. Repeating a scoped sweep after completion attempted zero items.

## Prior hanging-test cause

The prior hang was caused by expecting `sweepPaymentLeases` to reject a per-item recovery failure even though the design intentionally aggregates failures, plus an open imported pool after assertion failure. Current tests assert per-item results/audit evidence and close pools; no weakening was used.
