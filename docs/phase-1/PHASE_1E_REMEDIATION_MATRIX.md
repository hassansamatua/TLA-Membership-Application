# Phase 1E Remediation Matrix

Date: 2026-11-04

Status: implemented and disposable-verified; **not accepted**.

## Independent-review findings

| Review finding | Original defect | Root cause | Files changed | Technical correction | Regression evidence | Actual result | Remaining limitation |
|---|---|---|---|---|---|---|---|
| CRITICAL-1 | Stale initiation reconciliation downgraded `SUCCESS` to `VERIFICATION_REQUIRED` while entitlement stayed active | Provider result was persisted without revalidating owner, `RECONCILING` status, lease, or current payment state; payment update lacked eligibility predicate | `service.ts`, `payment-operations.test.mjs` | Final transaction locks attempt/payment, validates owner/status/lease/current payment, and applies only conditional eligible transitions; stale outcomes return `STALE_CLAIM` or `STALE_PAYMENT_STATE` | Worker A delayed `OUTCOME_UNKNOWN`; Worker B settled `SUCCESS`; entitlement remained active | Passed; payment `SUCCESS`, attempt `COMPLETED`, entitlement `active` | Real provider latency/timeout semantics remain unknown |
| CRITICAL-1 extension | Expired or reclaimed claim could overwrite newer state | Same missing final owner validation | `service.ts`, `payment-operations.test.mjs` | Owner/status/lease revalidated under row locks; stale worker writes only audit evidence | Worker A lease expired; worker B reclaimed and reached `PROVIDER_ACCEPTED`; A returned late unknown | Passed; A returned `STALE_CLAIM`, attempt remained `PROVIDER_ACCEPTED` | No deployed scheduler yet |
| HIGH-1 | Provider response with no `memberReference` settled as `SUCCESS` | Member identity check only ran when field was present | `service.ts`, `payment-operations.test.mjs` | Member identity is required, format-bounded, and compared to server-created payment reference; invalid evidence creates reconciliation case | Missing, malformed, and mismatched references | Passed; all rejected to `RECONCILIATION_REQUIRED`, no entitlement for missing identity | Provider contract must define this value for live integration |
| HIGH-2 | New unresolved refund event disappeared under an existing `RESOLVED` case | Unique `(payment_id,case_type)` upsert retained old resolved row and subject | `007_phase1e_remediation.sql`, `service.ts`, `payment-operations.test.mjs` | Added `recurrence_index`, `parent_case_id`, `evidence_history`; active case appends evidence, resolved/cancelled case creates linked `OPEN` recurrence | Resolve first case, create second uncertain refund, list default queue | Passed; new `OPEN` recurrence had new subject and appeared in queue | Evidence history remains local JSON, not an external immutable store |
| HIGH-2 related | Apparent duplicate case update | Reviewer identified two `UPDATE`-looking statements | `service.ts` inspected | Confirmed one `UPDATE` applies only to unresolved case; separate `INSERT` applies only to linked recurrence, not the same row | MariaDB JSON append verified; history length asserted | Passed; exactly two entries for two events | — |
| HIGH-3 | Arbitrary caller-supplied `actorId` could invoke sweeps and impersonate actors | No worker credential or authenticated service principal | `007_phase1e_remediation.sql`, `service.ts`, `phase1a-worker.mjs`, `payment-operations.test.mjs` | Added `payment_recovery_workers` key/hash table; required `workerKey`/`workerSecret`; audit uses authenticated worker row, not supplied actor ID | Missing/wrong credentials rejected; audit actor checked against registered worker | Passed; `actor_type='recovery_worker'`, actor ID matched worker record, not admin | Worker secret provisioning/rotation is out of disposable scope |
| MEDIUM-1 | Direct recovery calls could bypass `maxAttempts` and `next_attempt_at` | Bounds existed only in sweep discovery | `service.ts`, `payment-operations.test.mjs`, `payment-foundation.test.mjs`, `payment-lifecycle.test.mjs` | `retry_count<MAX_RECOVERY_ATTEMPTS` and due-time predicates moved into initiation/refund claim statements | Direct deferred refund call | Passed; rejected as not due | Initiation retry maximum remains constant `MAX_RECOVERY_ATTEMPTS=5` |
| MEDIUM-2 | Recovery failure state and reconciliation/audit evidence used separate transactions | Request/attempt update committed before case/audit write | `service.ts`, `payment-operations.test.mjs` | Failure state, case/evidence, reconciliation audit, and retry audit are written in one transaction | Disposable trigger failures for initiation/refund | Passed; failed audit write rolled back associated transition | No durable fallback if audit persistence itself is down |
| MEDIUM-3 | Swept refund failure consumed two retries | Claim incremented once and sweeper catch incremented again | `service.ts`, `payment-operations.test.mjs` | Sweeper adds a retry only when operation failed before claim; provider-confirmed path now uses claim and consumes one attempt | Deferred provider-confirmed request and malformed mixed request | Passed; confirmed request `retry_count=1`, failure count matched failure audit count | Failure audit naming may still aggregate broad categories |
| MEDIUM-4 | `LEASE_EXPIRED` and `RECOVERY_SUCCEEDED` were emitted for inaccurate states/outcomes | One generic discovery event and unconditional success event | `service.ts`, `payment-operations.test.mjs` | Discovery events now distinguish `RECOVERY_QUEUED`, `LEASE_EXPIRED`, `RETRY_DUE`; results distinguish success, inconclusive, stale claim, and failure | Sweep audit assertions | Passed | Events are local DB records only |
| MEDIUM-5 | `is_admin=1` alone could access reconciliation administration | Authorization accepted `is_admin` OR `finance_admin` | `service.ts`, `payment-operations.test.mjs` | `requireFinanceAdmin` now requires `role='finance_admin'` | Ordinary admin `is_admin=1`, `role='admin'` | Passed; list/detail/claim/escalate/resolve rejected | Role assignment governance remains outside this disposable phase |
| MEDIUM-5 related | Ordinary users/admins might self-promote to `finance_admin` | Possible writable role paths needed inspection | Inspected `app/api/user/profile/route.ts`, `app/api/admin/users/[id]/route.ts` | Profile path does not write role; general user update writes `name`, `email`, `is_admin`, `is_approved`, not `role` | Source inspection | Confirmed no inspected path can set `role='finance_admin'` | Route authorization/type issues remain in repository-wide baseline |
| LOW-1 | Manual confirmation could be confused with provider confirmation | Manual path used `PROVIDER_CONFIRMED` status and `MANUAL-*` reference | — | Evidence and `MANUAL_CONFIRMED` last operation retained | Existing manual refund assertions | Pass | A dedicated `MANUALLY_CONFIRMED` state may be clearer in a later schema |
| LOW-2 | Notification identity persisted after settlement rather than atomically | Insert occurred after successful settle transaction | — | Unchanged in Phase 1E; notification duplicate controls still exist | Existing suites | Pass | May warrant a later transaction-boundary change |
| LOW-3 | Parent process could not inspect child-process gateway counter | Counter was process-local | `phase1a-worker.mjs` unchanged | Source path remains verify-only for persisted provider references | Existing mixed concurrent assertions | Passed | Could add cross-process counters later |

## Additional required verification

| Requirement | Evidence | Result |
|---|---|---|
| Reconciliation-required refund stays blocked even when retry is due | Existing `REFUND_RECONCILIATION_REQUIRED` request without provider reference remained excluded from scoped sweep | Passed |
| Underlying retry/backoff cannot be bypassed | Direct `PROVIDER_CONFIRMED` call with future `next_attempt_at` rejected | Passed |
| Exact retry increment | `PROVIDER_CONFIRMED` completion `retry_count=1`; failed attempts matched `RECOVERY_FAILED` count | Passed |
| Audit failure rollback | Initiation and refund disposable triggers rolled back associated transition | Passed |
| Evidence history exactness | Two events produced `JSON_LENGTH(evidence_history)=2` | Passed |
| Unauthorized worker cannot forge actor | Wrong/missing worker credentials rejected; audit actor was registered worker row | Passed |
| Ordinary admin cannot administer cases | `role='admin'` with `is_admin=1` rejected across all case operations | Passed |

## Final verification summary

| Check | Result |
|---|---|
| Sequential disposable suites | 5/5 passed |
| Expanded operations suite | Passed |
| Isolated concurrency suite | Passed |
| Standard npm tests | 6 passed, 5 expected skips |
| Focused TypeScript | Passed |
| Focused ESLint | Passed |
| Repository TypeScript | Failed: 340 diagnostics |
| Repository ESLint | Failed: 451 errors, 222 warnings |
| Production build | Passed; type validation skipped |
| `git diff --check` | Passed |

Phase 1E is ready for a fresh independent review only. It is **not accepted**.
