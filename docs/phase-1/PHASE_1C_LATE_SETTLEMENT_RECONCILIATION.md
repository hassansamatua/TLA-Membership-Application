# Phase 1C Late Settlement Reconciliation

Date: 2026-11-02

## Defect corrected

Phase 1B checked `expires_at` before contacting the provider. A late `SUCCESS` could therefore be discarded without transaction identity, entitlement, or reconciliation evidence.

## Implemented flow

Settlement is now two-stage:

1. Read payment/provider identity and call `checkTransactionStatus()` outside the database transaction.
2. Open a short transaction, lock the payment, allocations, reservations and entitlement rows, and revalidate all evidence before settlement.

Provider lookup failure is handled safely:

- expired or reconciliation-state payment -> `RECONCILIATION_REQUIRED` plus evidence;
- active payment -> `VERIFICATION_REQUIRED`, retaining its reservation.

Provider `PENDING` on an expired payment also opens reconciliation instead of silently discarding it.

## Late `SUCCESS` outcomes

- Reservation still active and owned by the payment: normal authoritative settlement is evaluated.
- Reservation expired, replaced, or cycle funded by another payment: payment becomes `RECONCILIATION_REQUIRED`.
- Provider transaction identity is persisted on the payment when unique; duplicate identities are preserved in the reconciliation case without violating uniqueness.
- `payment_reconciliation_cases` receives an `OPEN` case with `provider_reference`, `provider_transaction_id` and JSON evidence.
- No entitlement is activated when local settlement cannot safely complete.

## Verified cases

- Late success while reservation remains valid: `SUCCESS`.
- Late success after reservation expiry: `RECONCILIATION_REQUIRED`, provider transaction ID and open case persisted.
- Late success after another payment funded the cycle: `RECONCILIATION_REQUIRED`; newer entitlement remains `active`.
- Provider lookup unavailable for expired/reconciliation payment: `RECONCILIATION_REQUIRED`.
- Reservation ownership changed between provider verification and DB lock: stale settlement is rejected and reconciliation is opened.
- Duplicate provider transaction identity: `RECONCILIATION_REQUIRED`, no entitlement, reconciliation case preserves identity.

## Audit evidence

Settlement/reconciliation writes `payment_audit_events` with structured `event_data`; late collections are also represented by `payment_reconciliation_cases` and notification rows when callbacks are processed.

Status: **PASS for canonical late-success containment; provider-specific reconciliation remains BLOCKED until official documentation exists.**
