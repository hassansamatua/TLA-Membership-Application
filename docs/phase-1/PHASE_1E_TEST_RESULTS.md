# Phase 1E Test Results

Date: 2026-11-04

Status: disposable verification passed; repository-wide baseline failures remain. **No acceptance decision is made here.**

The disposable target remained the existing `phase1a_test` database on MariaDB 10.4.32. The database was not recreated, dropped, reset, or overwritten. No credentials were printed.

## Actual execution evidence

| Check | Actual result |
|---|---|
| `node --experimental-strip-types --test tests/payment-operations.test.mjs` | Exit 0; 1 test, 1 pass, 0 fail; duration 2255.2489 ms |
| `node --experimental-strip-types --test --test-concurrency=1 tests/payment-foundation.test.mjs tests/payment-concurrency.test.mjs tests/payment-validation.test.mjs tests/payment-lifecycle.test.mjs tests/payment-operations.test.mjs` | Exit 0; 5 tests, 5 pass, 0 fail, 0 skipped; duration 6544.6135 ms |
| Isolated `node --experimental-strip-types --test tests/payment-concurrency.test.mjs` | Exit 0; 1 pass; duration 2335.5418 ms |
| `npm test` | Exit 0; 11 tests, 6 pass, 5 skipped, 0 fail; duration 368.2837 ms |
| Focused TypeScript on `lib/payments/service.ts` and `lib/payments/gateways.ts` | Exit 0 |
| Focused ESLint on payment service/tests/worker | Exit 0; no errors or warnings |
| `npx tsc --noEmit --pretty false` | Exit 2; 340 diagnostic lines in existing generated route, API/auth, component, `app/scripts`, and `lib/db-utils` code |
| `npm run lint` | Exit 1; 673 problems: 451 errors, 222 warnings |
| `npm run build` | Exit 0; compiled in 14.7s and generated 144 pages; build configuration skips type validation |
| `git diff --check` | Exit 0 |

The five standard-test skips are the disposable payment suites because `PHASE1A_TEST_DB` is not set for ordinary `npm test`; they were executed explicitly and passed under disposable authorization.

## Disposable regression coverage

The expanded operations suite covered:

1. **Original critical race** — worker A began reconciliation, worker B settled the payment to `SUCCESS`, and worker A's delayed `OUTCOME_UNKNOWN` returned `STALE_PAYMENT_STATE` without downgrading `SUCCESS`; entitlement remained active.
2. **Expired/reclaimed recovery claim** — worker A's lease was expired, worker B reclaimed and returned `PROVIDER_ACCEPTED`; worker A's late unknown result returned `STALE_CLAIM` and did not alter the attempt.
3. **Member identity** — missing, malformed, and mismatched `memberReference` responses were rejected to `RECONCILIATION_REQUIRED`; missing identity produced no entitlement.
4. **Resolved-case recurrence** — a second uncertain refund after resolution created a linked `OPEN` case with `recurrence_index=1`, `parent_case_id` set to the first case, the second request as subject, and visibility in the default unresolved queue.
5. **Evidence history** — two evidence events against one unresolved case produced exactly two `evidence_history` entries.
6. **Worker authentication** — missing key, wrong secret, and nonexistent worker were rejected; child-process sweeps supplied `RECOVERY_WORKER_KEY`/`RECOVERY_WORKER_SECRET` through environment variables.
7. **Worker audit identity** — sweep audit rows used `actor_type='recovery_worker'` and the authenticated `payment_recovery_workers.id`; an arbitrary administrative actor ID was not recorded.
8. **Finance-admin role boundary** — an `is_admin=1` user with `role='admin'` was rejected for list, detail, claim, escalation, and resolution; members remained rejected.
9. **Underlying backoff** — a direct `PROVIDER_CONFIRMED` refund call was rejected while `next_attempt_at` remained in the future.
10. **Exact retry accounting** — a provider-confirmed completion consumed exactly one retry; malformed request failures produced exactly one `RECOVERY_FAILED` audit row per attempted sweep.
11. **Initiation audit rollback** — an `INITIATION_RECOVERY_FAILED` insert failure rolled back retry/error updates while preserving the original error.
12. **Refund audit rollback** — a `REFUND_RECONCILIATION_REQUIRED` insert failure rolled back the reconciliation state and left the request `PENDING_PROVIDER` without retry/error evidence.
13. **Concurrent sweeps** — two scoped refund workers completed exactly one refund operation; unscoped workers processed a bounded mixed success/failure batch.
14. **Repeated sweep idempotence** — repeated scoped sweeps attempted zero work.
15. **Reconciliation-required refund blocking** — an uncertain request without provider evidence remained unavailable to sweeps and direct retries.

## MariaDB behavior verification

Direct database verification on MariaDB `10.4.32-MariaDB` returned:

```text
JSON_ARRAY_APPEND(JSON_ARRAY('a'),'$','b') => ["a","b"]
```

The schema contains `recurrence_index`, `parent_case_id`, `evidence_history`, the unique `(payment_id,case_type,recurrence_index)` key, the parent index, and the `payment_recovery_workers` table.

## Execution incidents resolved during verification

- An initial disposable run failed because MariaDB JSON syntax used `CAST(? AS JSON)` inside `JSON_ARRAY_APPEND`; the implementation was corrected for MariaDB 10.4 semantics.
- A concurrent refund sweep exposed a transient `ER_LOCK_DEADLOCK`; the sweeper now retries one claimed recovery operation once after deadlock while retaining per-item failure isolation.
- A fixture manually changed a request to `PROVIDER_CONFIRMED` without clearing its future retry time; the fixture now clears `next_attempt_at` before due completion.
- A lifecycle fixture retried reconciliation before `next_attempt_at`; it now explicitly marks the retry due.
- A provider-confirmed recovery initially bypassed the durable claim and therefore consumed zero retries; the claim path now increments `retry_count` exactly once and binds local completion to the authenticated worker owner.
- A generic audit trigger prevented the claim audit as well as the intended recovery-failure audit; it was scoped to `INITIATION_RECOVERY_FAILED`.

## Repository limitations confirmed by verification

- Repository TypeScript still fails with 340 diagnostic lines.
- Repository ESLint still fails with 451 errors and 222 warnings.
- Production build passes but explicitly skips type validation.
- The shared disposable schema still requires sequential payment-suite execution.
- No production scheduler/worker deployment, immutable external audit sink, monitoring, or real provider semantics exist.
