# Phase 1C Refund Lease Recovery

Date: 2026-11-02

## Defect corrected

A worker could leave `payment_refund_requests` permanently `PENDING_PROVIDER`. A retry was rejected as already processing even when the lease was stale.

## Lease fields

The refund request now records:

- `claim_owner`
- `claimed_at`
- `lease_expires_at`
- `retry_count`
- `last_operation`
- `last_error`

Lease duration in the implementation is 120 seconds.

## Recovery semantics

- `REQUESTED`: atomically claimed for provider execution.
- `PENDING_PROVIDER` with unexpired lease: rejected as in-flight.
- Expired `PENDING_PROVIDER` with provider refund reference: reclaimed for verification only.
- Expired `PENDING_PROVIDER` without provider refund reference: marked `RECONCILIATION_REQUIRED`; no second provider initiation occurs.
- `RECONCILIATION_REQUIRED` with provider refund reference: may verify that existing reference.
- `RECONCILIATION_REQUIRED` without provider reference: requires reconciliation and cannot blindly retry.
- `PROVIDER_CONFIRMED`: local completion only; no external refund call.
- `COMPLETED`: immutable.

## External-call boundaries

Provider refund initiation and verification occur outside local DB transactions. The provider reference is persisted before verification. Local financial reversal occurs only after confirmation in a second transaction.

## Covered scenarios

- Stale lease with an existing provider refund reference recovers without another `initiateRefund()` call.
- Provider refund timeout with no reference moves to reconciliation and blocks blind retry.
- Provider-confirmed/local-failure recovery completes without a second external refund.
- Independent-process concurrent refund workers produce one refund and one safe rejection.
- Allocation reversal remains allocation-specific and unrelated cycles remain paid.

## Remaining limitation

If provider initiation may have succeeded but no reference was returned, correct resolution depends on provider-specific lookup/idempotency that is not documented yet. The implementation preserves `RECONCILIATION_REQUIRED` rather than retrying.

Status: **PASS for canonical lease recovery; provider-specific uncertain refund lookup is BLOCKED.**
