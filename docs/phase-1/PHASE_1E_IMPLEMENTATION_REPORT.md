# Phase 1E Implementation Report

Date: 2026-11-04

Status: implementation and disposable verification complete; **not accepted**. A fresh independent security review is mandatory.

The implementation used only the existing disposable `phase1a_test` database. No credentials were printed. No production/staging migration, `next_auth` modification, live payment/refund, AzamPay integration, endpoint activation, scheduler deployment, or membership business-rule change occurred.

## Implemented remediations

### 1. Stale initiation recovery race

`reconcilePaymentInitiation` now performs a second locked validation after provider lookup. It re-reads the initiation attempt and payment `FOR UPDATE`, verifies `RECONCILING`, `claim_owner`, and lease validity, and applies outcomes only while the payment remains in `PENDING`, `PROCESSING`, or `VERIFICATION_REQUIRED`.

A stale claim commits only `RECOVERY_STALE_CLAIM` evidence and returns `STALE_CLAIM`. A valid claim observing a newer payment state marks the attempt `COMPLETED`, records `INITIATION_RECOVERY_STALE_STATE`, and returns `STALE_PAYMENT_STATE`. Conflicting accepted/rejected outcomes against an ineligible payment state also create linked reconciliation evidence.

Terminal transitions now support expected-source-state predicates.

### 2. Mandatory verified member identity

Settlement now requires `memberReference` to be a non-empty, bounded, well-formed string equal to the server-created payment reference. Missing, malformed, and mismatched identities are rejected, reconciliation evidence is persisted, and no entitlement activates.

### 3. Reconciliation recurrence and evidence history

`payment_reconciliation_cases` now defines uniqueness as `(payment_id, case_type, recurrence_index)` and adds `parent_case_id` and `evidence_history`.

When a case is already unresolved, new evidence is appended to that case and the original subject remains authoritative. When the previous case is resolved or cancelled, the next event creates a linked `OPEN` recurrence with the new financial subject and `parent_case_id` pointing to the prior case. The unresolved queue therefore discovers the new work while preserving prior resolution history.

The apparent “two consecutive UPDATEs” were investigated. The actual control flow is one `UPDATE` on the unresolved branch or one `INSERT` on the recurrence branch; they are not consecutive writes to the same row. MariaDB 10.4 JSON behavior was verified directly: `JSON_ARRAY_APPEND(JSON_ARRAY('a'),'$','b')` returns `["a","b"]`.

### 4. Authenticated recovery-worker boundary

`payment_recovery_workers` stores an active worker key and SHA-256 secret hash. `sweepPaymentLeases` requires `workerKey` and `workerSecret`; arbitrary `actorId` is no longer accepted or trusted. Audit rows use `actor_type='recovery_worker'` and the authenticated `payment_recovery_workers.id`, while `workerId` remains a separate lease-owner token.

### 5. Finance-admin authorization boundary

Reconciliation administration now requires `role='finance_admin'`; `is_admin=1` alone is no longer sufficient. Disposable tests cover denial for an ordinary administrator and for a member.

Source inspection found no profile or general user-update path that writes `users.role`. The profile endpoint inspected is read-only for role, and the general admin user update writes `name`, `email`, `is_admin`, and `is_approved` but not `role`; therefore `is_admin` changes cannot promote a user to `finance_admin` through that path.

### 6. Retry, backoff, and exact attempt semantics

Initiation and refund recovery now enforce `retry_count < MAX_RECOVERY_ATTEMPTS` and `next_attempt_at <= NOW()` inside their underlying claim statements, not only during sweep discovery.

Refund request recovery increments `retry_count` exactly once in the claim transaction. The sweeper no longer adds a second increment for claimed operations. It only increments once when an item failed before it could be claimed. `PROVIDER_CONFIRMED` local completion now uses a durable claim and consumes exactly one retry.

### 7. Atomic failure and audit persistence

Initiation lookup failure updates retry/error evidence and writes `INITIATION_RECOVERY_FAILED`/`RETRY_SCHEDULED` in one transaction. Refund provider failure updates request state, opens/appends reconciliation evidence, writes `REFUND_RECONCILIATION_REQUIRED`, and schedules retry evidence in one transaction.

Disposable triggers proved rollback for initiation and refund recovery audit failures, in addition to existing reconciliation claim/renewal/escalation rollback tests.

### 8. Audit event semantics

Sweep discovery distinguishes `RECOVERY_QUEUED`, `LEASE_EXPIRED`, and `RETRY_DUE`. Outcomes distinguish `RECOVERY_SUCCEEDED`, `RECOVERY_INCONCLUSIVE`, `RECOVERY_CLAIM_LOST`, and `RECOVERY_FAILED`. `RECOVERY_SUCCEEDED` is no longer emitted for unresolved or stale results.

## Files changed

- `lib/payments/service.ts`
- `tests/payment-operations.test.mjs`
- `tests/payment-foundation.test.mjs`
- `tests/payment-lifecycle.test.mjs`
- `tests/phase1a-worker.mjs`
- `migrations/phase1a/007_phase1e_remediation.sql`

## Verified defect coverage

| Requirement | Disposable evidence |
|---|---|
| Worker A unknown outcome cannot downgrade Worker B `SUCCESS` | Passed; payment remained `SUCCESS`, attempt `COMPLETED`, entitlement `active` |
| Expired/reclaimed stale workers | Passed; first worker returned `STALE_CLAIM`, replacement worker returned `PROVIDER_ACCEPTED` |
| Missing/malformed/mismatched member identity | Passed; all rejected to `RECONCILIATION_REQUIRED`, no entitlement |
| Recurrence after resolved case | Passed; new linked `OPEN` case had `recurrence_index=1`, new subject, and appeared in queue |
| Active unresolved evidence append | Passed; two events produced exactly two history entries |
| Worker authentication and actor integrity | Passed; missing/wrong credentials rejected; audit actor matched registered worker, not admin |
| Finance-admin role boundary | Passed; `is_admin=1` with `role='admin'` rejected for list/detail/claim/escalate/resolve |
| Underlying backoff/retry bounds | Passed; direct deferred refund rejected as not due |
| Exactly one retry increment | Passed; provider-confirmed completion consumed `retry_count=1`; failed attempts matched failure audit count |
| Audit rollback | Passed for initiation recovery and refund reconciliation persistence |
| Concurrent workers | Passed; no duplicate refund operation |

## Verification summary

- Sequential disposable suites: **5/5 passed**
- Expanded Phase 1E operations suite: **passed**
- Isolated concurrency suite: **passed**
- Standard tests: **6 passed, 5 expected DB skips**
- Focused TypeScript/ESLint: **passed**
- Repository TypeScript/ESLint: **still failed**
- Production build: **passed, but type validation is skipped**
- `git diff --check`: **passed**

Detailed output is recorded in `PHASE_1E_TEST_RESULTS.md`.

## Restrictions preserved

No production access, staging migration, `next_auth` modification, live provider operation, payment endpoint activation, scheduler/worker deployment, AzamPay integration, credential disclosure, or fee/penalty/exemption/grace-period change occurred.

Phase 1E is not accepted and remains subject to a fresh independent security review.
