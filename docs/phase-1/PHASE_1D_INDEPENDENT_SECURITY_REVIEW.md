# Phase 1D Independent Technical Review

Date: 2026-11-04

Scope: service implementation, disposable migrations, SQL behavior, authorization controls, transaction boundaries, disposable tests, worker harness, all six Phase 1D reports, and independently executed probes against `phase1a_test`.

## Executive verdict

**REJECTED**

The implementation contains a critical financial-state race: an initiation reconciliation outcome is persisted without verifying that the worker still owns the `RECONCILING` lease or that the payment remains in an eligible state. A stale `OUTCOME_UNKNOWN` result was reproduced downgrading a concurrently verified `SUCCESS` payment to `VERIFICATION_REQUIRED` while its entitlement remained active.

Independent probes also confirmed that a provider response with no member identity can settle as `SUCCESS`, and that a `RESOLVED` reconciliation case remains resolved when a new unresolved refund event occurs, hiding the new financial discrepancy from the normal unresolved queue.

The reported 5/5 sequential disposable suite result reproduced, but it does not cover these defects. Passing the supplied tests is therefore not sufficient evidence for acceptance.

## Files and areas inspected

### Implementation

- `lib/payments/service.ts`
  - payment intent and reservation lifecycle
  - provider verification and settlement
  - initiation reconciliation
  - refund request/provider/local completion lifecycle
  - lease sweeper
  - reconciliation administration
  - audit helpers
- `lib/payments/gateways.ts`
- `lib/db.ts`
- `tests/phase1a-worker.mjs`

### Migrations

- `migrations/phase1a/002_payment_foundation.sql`
- `migrations/phase1a/003_payment_integrity_remediation.sql`
- `migrations/phase1a/005_payment_lifecycle_recovery.sql`
- `migrations/phase1a/006_payment_operations_reconciliation.sql`

### Tests

- `tests/payment-foundation.test.mjs`
- `tests/payment-concurrency.test.mjs`
- `tests/payment-validation.test.mjs`
- `tests/payment-lifecycle.test.mjs`
- `tests/payment-operations.test.mjs`

### Reports reviewed

- `PHASE_1D_IMPLEMENTATION_REPORT.md`
- `PHASE_1D_LEASE_SWEEPER_DESIGN.md`
- `PHASE_1D_RECONCILIATION_WORKFLOW.md`
- `PHASE_1D_AUDIT_CONTROLS.md`
- `PHASE_1D_TEST_RESULTS.md`
- `PHASE_1D_REMAINING_RISKS.md`

## Verified strengths

- Payment intent creation is member-approved, member-bound, amount-calculated, and transactional.
- Cycle reservations use a unique member-cycle constraint and are rechecked during settlement.
- Settlement validates provider reference, amount, currency, terminal state, and mandatory provider transaction identity.
- Duplicate provider transaction identity is detected before settlement and produces reconciliation evidence.
- Entitlement uniqueness prevents ordinary duplicate member-cycle funding.
- Refund requests are durable and use unique request/provider references.
- Refund provider calls occur outside the long local completion transaction.
- Existing provider refund references cause verify-only recovery rather than blindly initiating another refund.
- Refund completion reverses only selected allocations and leaves independently paid allocations active in the covered paths.
- Initiation sweeps use a distinct `RECONCILING` claim state at claim time.
- Refund sweeps use durable ownership, lease expiry, provider references, bounded selection, and `next_attempt_at`.
- Case claim, renewal, escalation and resolution paths are transactional with audit insertion.
- Expired reconciliation claims and stale worker ownership were tested and rejected in the supplied scenarios.
- Disposable audit-failure triggers demonstrated rollback for claim, renewal and escalation transitions.
- Scoped refund sweeps do not run initiation discovery.
- The sweep `limit` now bounds total discovered operations in one invocation.
- Deferred `PROVIDER_CONFIRMED` refund work respects `next_attempt_at`.
- AzamPay remains blocked pending official provider semantics; no live provider behavior was invented.

## Confirmed defects

### CRITICAL-1 — Stale initiation reconciliation can overwrite a settled payment

`reconcilePaymentInitiation` claims the attempt atomically, then performs provider lookup outside the transaction. After the lookup it opens a second transaction and writes the outcome without verifying:

- `claim_owner` still matches the worker;
- the attempt remains `RECONCILING`;
- the lease remains active;
- the payment remains in an eligible state.

The `OUTCOME_UNKNOWN` branch unconditionally sets the payment to `VERIFICATION_REQUIRED`. `terminalPayment` also updates the requested terminal status without an eligibility predicate, so a delayed definite rejection can likewise overwrite a committed state.

Relevant implementation:

- `lib/payments/service.ts:151-158` — claim commits before provider lookup.
- `lib/payments/service.ts:169-196` — provider result is persisted without owner/state revalidation.
- `lib/payments/service.ts:43-47` — terminal payment update has no source-state predicate.

Reproduced result:

```json
{
  "settledStatus": "SUCCESS",
  "final": {
    "payment_status": "VERIFICATION_REQUIRED",
    "attempt_status": "OUTCOME_UNKNOWN",
    "entitlement_status": "active"
  }
}
```

The probe delayed `checkInitiation`, settled the same payment to `SUCCESS`, then allowed the stale reconciliation to finish. The confirmed payment was downgraded while the active entitlement remained.

This violates the requirement that expired or competing recovery claims cannot unsafely process the same operation and breaks the financial lifecycle invariant.

### HIGH-1 — Provider verification does not require member identity

The settlement code only compares `verification.memberReference` if a value is present:

```ts
if(verification.memberReference&&verification.memberReference!==payment.reference)
```

A verification response can therefore omit `memberReference` entirely and still settle. Reproduced response keys:

```json
[
  "providerReference",
  "providerTransactionId",
  "state",
  "amount",
  "currency"
]
```

Reproduced result:

```json
{
  "settlementStatus": "SUCCESS",
  "paymentStatus": "SUCCESS"
}
```

This fails the explicit requirement to verify member identity. The supplied tests cover a mismatched `memberReference`, not a missing one.

### HIGH-2 — A resolved reconciliation case does not reopen for a new unresolved financial event

`openReconciliation` uses the unique `(payment_id,case_type)` key and updates provider/evidence fields on duplicate, but does not update `status` or create a new subject-specific case.

Reproduced result:

```json
{
  "caseStatus": "RESOLVED",
  "subjectId": 183,
  "requests": [
    { "id": 183, "status": "RECONCILIATION_REQUIRED" },
    { "id": 184, "status": "RECONCILIATION_REQUIRED" }
  ]
}
```

The first uncertain refund was resolved through the workflow. A second allocation then produced another unresolved request under the same case type. The existing case remained `RESOLVED`, so the new discrepancy is excluded from the default `OPEN`, `ASSIGNED`, `ESCALATED` queue.

The same upsert also replaces evidence/provider fields with the latest values, potentially null, while retaining the original subject ID. This does not reliably preserve the financial evidence for either event.

### HIGH-3 — Sweeper invocation has no caller authorization or trusted worker identity

`sweepPaymentLeases` is an exported operation that accepts an arbitrary `actorId` and `workerId` but performs no authorization check and does not authenticate the worker boundary.

Relevant code:

- `lib/payments/service.ts:442-448` — caller-supplied `actorId`/`workerId`.
- `lib/payments/service.ts:449-452` — caller-supplied actor ID is written into audit records.
- `lib/payments/service.ts:492-547` — unlike reconciliation administration, there is no `requireFinanceAdmin` or equivalent authorization.

Any caller able to reach the service boundary can trigger recovery processing and can attribute sweep audit events to any valid `actor_id`. Although the refund operation itself uses `requested_by`, the sweep invocation and audit actor remain unauthenticated.

The reports acknowledge that no scheduler boundary exists, but this is not merely a deployment limitation: the currently exported operation has no authorization contract.

### MEDIUM-1 — Retry limits and backoff can be bypassed outside sweep discovery

`maxAttempts` and `next_attempt_at` are enforced in the sweeper’s selection queries, not in the underlying recovery operations.

- `reconcilePaymentInitiation` can claim eligible statuses without checking `retry_count` or `next_attempt_at`.
- `refundPaymentAllocations` can claim `REQUESTED`, stale `PENDING_PROVIDER`, or referenced `RECONCILIATION_REQUIRED` requests without checking `retry_count` or `next_attempt_at`.

A direct service caller can therefore bypass the bounded retry policy described for the sweeper. Bounds must either be enforced in the claim transaction itself or the underlying functions must be reachable only through a trusted bounded worker boundary.

### MEDIUM-2 — Recovery failure state and audit/case evidence are not atomic

Two failure paths persist state outside the transaction that records associated evidence:

- In `reconcilePaymentInitiation`, provider lookup failure updates the attempt in one query and then writes `INITIATION_RECOVERY_FAILED` through a separate non-transactional audit insert.
- In `refundPaymentAllocations`, provider-operation failure updates the request to `RECONCILIATION_REQUIRED`, then calls `markRefundReconciliation` in a separate transaction to create the case and audit event.

If the second write fails, the state transition remains but the reconciliation/audit evidence may be absent. This does not meet the stated audit-failure rollback standard outside the narrower claim/escalation paths that were tested.

### MEDIUM-3 — A swept refund failure consumes two retry increments

A refund claim increments `retry_count` inside `refundPaymentAllocations`. If recovery then fails, `sweepPaymentLeases` increments `retry_count` again while setting `next_attempt_at`.

One recovery attempt can therefore consume two retries, causing premature exhaustion relative to the declared attempt semantics and potentially masking useful audit history.

### MEDIUM-4 — Recovery audit event names are not always accurate

The sweeper emits `LEASE_EXPIRED` for every selected row, including:

- `REQUESTED` initiation attempts selected by age rather than an expired lease;
- `REQUESTED` refunds with no lease;
- retry-due operations whose lease did not expire.

It also emits `RECOVERY_SUCCEEDED` and increments `initiationRecovered`/`refundsRecovered` whenever the recovery function returns, including outcomes that remain `OUTCOME_UNKNOWN` or `RECONCILIATION_REQUIRED`.

These names do not accurately distinguish lease expiry, processing success, continued uncertainty, and reconciliation requirement.

### MEDIUM-5 — Finance-admin authorization may be broader than required

`requireFinanceAdmin` accepts either `role='finance_admin'` or any `is_admin=1` user. If `is_admin` includes non-finance administrators, this exceeds the stated finance-admin boundary. The supplied test uses `is_admin=1` users and therefore does not distinguish finance administrators from other administrators.

### LOW-1 — Manual refund confirmation semantics can be misread as provider confirmation

A `manual_approver` refund creates a `MANUAL-*` provider reference and stores the request as `PROVIDER_CONFIRMED`, although no provider call occurred. The implementation does require an approval ID and evidence for a new manual request, so this is not an unauthenticated fabrication. Nevertheless, the shared status name may misrepresent the authority type in downstream reconciliation and audit review.

### LOW-2 — Provider notification persistence is not atomic with settlement

`processGatewayNotification` settles first and inserts `payment_notifications` afterward. A non-duplicate insert failure can leave a settled payment without persisted notification identity. Unique-event handling is protected, but settlement and notification evidence are not transactional.

### LOW-3 — Test evidence does not observe child-process gateway counters

The Phase 1D test asserts the parent `gateway.refundInitiations` counter remains zero. Independent worker processes register separate gateway instances, so the parent counter cannot prove no child made an external call. Source inspection indicates existing provider references use verify-only recovery, but the test evidence is weaker than reported.

## Test verification assessment

### Independently reproduced checks

Sequential disposable suites:

```text
tests 5
pass 5
fail 0
skipped 0
duration_ms 6315.1795
```

Standard tests:

```text
tests 11
pass 6
skipped 5
fail 0
duration_ms 365.5301
```

Focused TypeScript on payment service/gateway: PASS.

Focused ESLint on payment service/tests/worker: PASS.

Repository TypeScript: FAIL — 340 diagnostic lines.

Repository ESLint: FAIL — 673 problems: 451 errors, 222 warnings.

Production build: PASS — compiled in 17.1s and generated 144 pages, while explicitly skipping type validation.

`git diff --check`: PASS.

### Coverage assessment

The supplied tests verify the ten reported ownership/audit scenarios and several recovery boundaries. They do **not** verify:

- a stale reconciliation result racing settlement;
- a second worker claiming after the first worker’s lease expires while provider lookup is still in flight;
- provider verification with omitted member identity;
- a new financial event against a resolved case;
- unauthorized or impersonated sweep invocation;
- direct recovery calls bypassing `maxAttempts`/`next_attempt_at`;
- failure paths where state update and reconciliation/audit persistence are not atomic;
- accurate meaning of `RECOVERY_SUCCEEDED` for unresolved outcomes.

The tests also mutate shared disposable state and therefore require sequential execution. A first parallel run was correctly identified as shared-fixture interference, not proof of correctness.

## Security and financial-integrity assessment

The core reservation/entitlement design remains stronger than the legacy flow: canonical reservations, entitlement uniqueness, provider transaction uniqueness, allocation-level reversal, and transactional settlement provide useful protections.

However, the initiation recovery race is a financial-integrity failure, not merely an operational imperfection. A payment that reached verified `SUCCESS` and activated an entitlement was observed being moved back to `VERIFICATION_REQUIRED`. This creates conflicting canonical records and could drive incorrect user-facing status, reporting, reconciliation, and downstream business decisions.

The missing member-identity requirement similarly weakens the boundary between provider evidence and local membership identity.

The unresolved-case defect can hide a second unresolved refund from the operational queue. This undermines the central purpose of Phase 1D: ensuring failed or uncertain financial operations remain visible until resolved.

The missing worker authorization does not mean the code is directly exposed through HTTP; no endpoint was activated. It does mean the implemented operation is not yet a controlled production worker boundary.

## Existing repository and operational limitations

These are not independently proven to cause the blocking defects, but remain important:

- 340 repository TypeScript diagnostic lines.
- 451 ESLint errors and 222 warnings.
- Build skips type validation.
- Recovery discovery plans use indexes but still filesort.
- No authorized scheduler/worker deployment boundary.
- No immutable external audit sink.
- No operational monitoring or dead-letter destination for audit persistence failure.
- No real provider initiation/refund lookup or callback semantics.
- No controlled evidence repository for manual refund evidence.
- Shared disposable schema causes cross-test interference under default parallel file execution.

Repository TypeScript/ESLint and build-validation issues are production prerequisites rather than reasons to reject the isolated disposable design by themselves. The missing scheduler/worker boundary is more directly related to Phase 1D because the sweep function is presently unauthenticated.

## Required remediation actions

Before a fresh independent review:

1. Enclose final initiation outcome persistence in a transaction that locks both payment and attempt rows.
2. Revalidate `RECONCILING` status, `claim_owner`, and lease ownership before applying provider outcomes.
3. Apply terminal reconciliation outcomes only through guarded state transitions; never downgrade `SUCCESS`/`REFUNDED`/other terminal financial states.
4. Reconcile or reopen payment state safely when a stale worker discovers its claim is no longer authoritative.
5. Require provider member identity when provider contracts define it, and explicitly document/provider-bind cases where member identity is represented only by payment reference.
6. Change reconciliation-case upsert behavior so a new unresolved event reopens the case or creates a subject-specific successor case while preserving original subject identity and cumulative evidence.
7. Preserve, rather than overwrite, provider references and evidence for repeated events.
8. Introduce an authenticated worker/sweeper boundary or a trusted internal invocation mechanism; do not accept caller-supplied `actorId` without validation.
9. Enforce retry/backoff in the underlying claim paths or make them unreachable except through the bounded trusted sweeper.
10. Make failure-state transitions and their reconciliation/audit evidence transactional where rollback is required.
11. Count one logical refund recovery attempt once.
12. Correct audit event semantics for initial discovery, lease expiry, attempted processing, unresolved outcome and completed outcome.
13. Clarify and enforce whether ordinary administrators are authorized finance administrators.
14. Add tests for stale outcome versus concurrent settlement, lease expiry during provider lookup, missing member identity, resolved-case reoccurrence, unauthorized sweep invocation, direct retry-limit bypass, and audit failure during provider-error recovery.
15. Provide per-suite disposable isolation or permanently enforce sequential payment tests.

Later prerequisites for provider sandbox/production:

- Implement an authorized scheduler/worker boundary with monitoring.
- Add an immutable external audit destination or equivalent controlled retention.
- Add controlled manual-evidence storage.
- Verify real provider lookup, callback authentication and idempotency semantics.
- Optimize recovery ordering/indexes if filesort becomes material.
- Remediate repository-wide TypeScript/ESLint failures and restore type validation.

## Final decision

**REJECTED**
