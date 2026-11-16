# Phase 1B Database Changes

Date: 2026-11-02  
Scope: `migrations/phase1a/003_payment_integrity_remediation.sql` and `004_audit_actor_integrity.sql`, applied only to disposable `phase1a_test`.

## `payment_cycle_reservations`

Purpose: durable member-cycle payment reservation.

- Primary key: `id`
- Unique: `(user_id, cycle_year)`
- FKs: `user_id -> users.id`, `payment_id -> payment_transactions.id`
- State: `ACTIVE`, `SETTLED`, `RELEASED`, `CANCELLED`, `EXPIRED`
- Expiry: `expires_at`
- Indexes: payment and `(status, expires_at)`

## `payment_refund_requests`

Purpose: durable refund request/outbox before provider execution.

- Primary key: `id`
- Unique: `(payment_id, request_key)` and `provider_refund_reference`
- FKs: `payment_id -> payment_transactions.id`, `requested_by -> users.id`
- State: `REQUESTED`, `PENDING_PROVIDER`, `PROVIDER_CONFIRMED`, `COMPLETED`, `FAILED`, `RECONCILIATION_REQUIRED`, `CANCELLED`
- Evidence: `manual_approval_id`, `evidence_hash`, `allocation_ids` JSON
- Timestamps: `created_at`, `confirmed_at`, `completed_at`, `updated_at`

## Allocation changes

`payment_cycle_allocations.status` now includes `REFUNDING`, making authorized request persistence and provider execution separately visible.

## Notification changes

- Added `provider_code` to `payment_notifications`.
- Added provider-scoped event index/constraint for `(provider_code, provider_event_id)`.
- Missing event IDs are rejected by service logic.

## Audit changes

- Added `event_data` JSON to `payment_audit_events`.
- Added actor index.
- Added `fk_audit_actor` for `actor_id -> users.id` when actor ID is present.

## Integrity observations

- `DECIMAL(12,2)` remains the financial amount type.
- `CHAR(3)` remains the currency type.
- Settlement/provider transaction identity remains unique by `(provider_code, provider_transaction_id)`.
- Canonical entitlement remains unique by `(user_id, cycle_year)` and allocation.
- A duplicate settlement now fails at reservation/entitlement validation before entitlement overwrite.
- Legacy `cycle_payment_status` lacks a `(user_id, cycle_year)` unique constraint, so the implementation explicitly selects/locks an existing row before insert instead of relying on `ON DUPLICATE KEY`.

## Verification

Applied only to `phase1a_test`:

```json
{"db":"phase1a_test","reservations":true,"refundRequests":true,"eventData":true,"auditActorFk":true}
```

`next_auth` remains unchanged.
