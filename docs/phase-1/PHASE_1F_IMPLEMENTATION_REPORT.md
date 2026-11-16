# Phase 1F Implementation Report

Date: 2026-11-06

Status: implementation and disposable verification complete; **not accepted**. A fresh independent security review is mandatory.

Scope was limited to the existing disposable `phase1a_test` database and disposable payment-foundation artifacts. No `next_auth` changes, production/staging access, live payment/refund execution, AzamPay integration, endpoint activation, scheduler/worker deployment, or membership financial-rule change occurred.

## Defect remediated

Independent review reproduced a stale original-initiation race:

1. The original provider initiation call remained pending.
2. A recovery worker reclaimed the expired attempt, confirmed provider acceptance, and settlement completed.
3. The entitlement became active.
4. The original call later returned a definite rejection.
5. The old completion path changed the payment to `FAILED` and the attempt to `DEFINITE_REJECTION` while the entitlement remained active.

## Corrections implemented

### Original initiation ownership and locked final validation

`executeInitiation` now binds each original provider call to a unique claim owner. `persistAcceptedInitiation`, `rejectInitiation`, and `markInitiationUnknown` each begin a final transaction that:

- locks the initiation attempt joined to its payment `FOR UPDATE`;
- revalidates `claim_owner`, expected attempt state, and lease validity;
- rereads the current payment state;
- returns `STALE_CLAIM` when another worker owns or completed the operation;
- returns `STALE_PAYMENT_STATE` when a still-owned operation observes a newer ineligible payment state;
- writes stale-operation audit evidence without changing the successful payment or active entitlement.

Terminal payment transitions use expected-source-state predicates, so a stale branch cannot update `SUCCESS`, `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED`, or `RECONCILIATION_REQUIRED` into an incompatible state.

### Recovery and reconciliation ownership

`reconcilePaymentInitiation` requires authenticated recovery-worker credentials. Its final transaction relocks and rereads the payment/attempt pair, validates `RECONCILING`, owner and lease state, checks payment eligibility, and records explicit stale outcomes.

`settlePayment` was inspected. Settlement rereads the payment under lock, validates provider identity and payment identity, uses allocation/reservation/entitlement state transitions, and does not permit a later initiation branch to reverse `SUCCESS` without ownership.

### Refund recovery worker boundary

Existing refund requests now require authenticated worker credentials for recovery. First-time administrative refund creation remains administrative. An existing request is authoritative for:

- amount;
- allocation IDs;
- reason;
- original requester;
- manual-approval metadata.

A worker may complete or recover the operation but cannot replace those persisted financial fields by supplying different call arguments. Refund completion audits the authenticated recovery worker while the stored refund preserves the original requester.

### Lock ordering

The refund completion path now locks payment before refund request, matching request validation. This removed the payment/request lock-cycle that previously produced `ER_LOCK_DEADLOCK` under concurrent refund workers.

### Schema integrity

`migrations/phase1a/008_phase1f_integrity.sql` adds a guarded self-referencing foreign key for `payment_reconciliation_cases.parent_case_id`. `007_phase1e_remediation.sql` is rerunnable on MariaDB 10.4 for the disposable schema.

## Files changed for Phase 1F

- `lib/payments/service.ts`
- `tests/payment-operations.test.mjs`
- `tests/payment-lifecycle.test.mjs`
- `tests/payment-foundation.test.mjs`
- `tests/phase1a-worker.mjs`
- `migrations/phase1a/007_phase1e_remediation.sql`
- `migrations/phase1a/008_phase1f_integrity.sql`

## Verified behavior

- Delayed definite rejection after successful recovery/settlement returns an explicit stale result and preserves `SUCCESS`, `PROVIDER_ACCEPTED`, active entitlement, and audit consistency.
- Delayed provider acceptance after successful recovery/settlement returns `STALE_CLAIM` and preserves successful state.
- Delayed `OUTCOME_UNKNOWN` after successful recovery/settlement returns `STALE_CLAIM` and does not create `FAILED` or `VERIFICATION_REQUIRED` audit state.
- Unauthenticated and wrong-secret direct initiation/refund recovery calls are rejected.
- Stored refund amount, allocation IDs, reason, and requester remain authoritative over forged recovery arguments.
- Refund-confirmation audit failure rolls back refund creation and leaves the request `PROVIDER_CONFIRMED`, allocation `REFUNDING`, and entitlement active.
- `007` executed twice without changing 326 reconciliation cases, 239 evidence-history entries, or 27 worker records.
- Invalid `parent_case_id` is rejected by `fk_reconciliation_parent`.

## Remaining governance limitation

Source inspection found no ordinary profile or general user-update path that writes `users.role`, but also found no authorized, auditable `finance_admin` grant/revoke process. This remains a production-readiness blocker and was not remediated by inventing an unsafe grant endpoint.
