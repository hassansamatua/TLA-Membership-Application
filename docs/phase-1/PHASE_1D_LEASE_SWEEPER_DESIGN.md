# Phase 1D Lease Sweeper Design

Date: 2026-11-04

Status: implemented and disposable-verified; not independently accepted.

`sweepPaymentLeases` discovers expired or due work using bounded indexed queries and supports both unscoped discovery and safe sharding.

## Scoping and bounds

- `paymentId` scopes both initiation and refund work to that payment.
- `refundRequestId` scopes refund work to one request and suppresses unrelated initiation discovery.
- Omitting IDs enables automatic discovery.
- `limit` is capped at 100 and applies globally to one sweep invocation: initiation attempts consume capacity before refund discovery uses the remaining capacity.
- `maxAttempts` bounds retry eligibility.

## Recovery semantics

- Initiation work claims atomically into `RECONCILING`; workers reconcile provider state rather than blindly initiating again.
- Refund work uses durable requests, provider references, ownership, lease expiry and bounded backoff.
- `PROVIDER_CONFIRMED` now respects `next_attempt_at`; local completion is not retried early.
- Claim conflicts are counted separately from failures.
- A failed item increments retry metadata and records `RECOVERY_FAILED`; unrelated eligible items continue.
- Sweep audit failures are counted in `auditFailed` and contained per item. Recovery is not attempted when prerequisite lease/attempt evidence cannot be persisted.
- Repeated sweeps do not initiate another external operation when a provider reference exists; they verify/reconcile existing state.

## Actual schema and plan evidence

The existing `phase1a_test` schema contains:

- `idx_initiation_recovery(status,lease_expires_at,next_attempt_at,retry_count)`
- `idx_refund_recovery(status,lease_expires_at,next_attempt_at,retry_count)`
- `idx_reconciliation_assignment(status,assigned_to,lease_expires_at)`
- `idx_reconciliation_subject(subject_type,subject_id)`
- `idx_audit_correlation(correlation_id)`

Actual `EXPLAIN` results:

- Initiation discovery: `range`, key `idx_initiation_status_lease`, estimated 27 rows, index condition plus filesort.
- Refund discovery: `range`, key `idx_refund_request_status`, estimated 41 rows, index condition plus filesort.

The queries are indexed and bounded; filesort remains an optimization risk at high table volume.

## Verified behavior

The expanded disposable test covered a deferred provider-confirmed request, scoped suppression of initiation work, unscoped limit=2 mixed success/failure work, two independent workers, no duplicate external refund call, failure retry/backoff evidence, and zero work on repeat scoped sweeps.

This remains a service-level entry point. No scheduler, payment endpoint, live worker, or provider-specific behavior was activated.
