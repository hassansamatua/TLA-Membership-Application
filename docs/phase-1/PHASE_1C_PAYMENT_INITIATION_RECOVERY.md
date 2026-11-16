# Phase 1C Payment Initiation Recovery

Date: 2026-11-02

## Purpose

Correct the Phase 1B defect where any payment-initiation exception was treated as a safe provider rejection and caused the member-cycle reservation to be released.

## Durable model

`payment_initiation_attempts` persists one canonical initiation attempt per payment. The attempt is created before the provider call.

States:

- `REQUESTED`
- `PENDING_PROVIDER`
- `PROVIDER_ACCEPTED`
- `OUTCOME_UNKNOWN`
- `DEFINITE_REJECTION`
- `RECONCILIATION_REQUIRED`
- `COMPLETED` reserved for operational completion

The claim path also records `claim_owner`, `claimed_at`, `lease_expires_at`, `retry_count`, `last_operation`, `last_error`, and `provider_outcome`.

## Lifecycle

1. Payment, allocations, reservations and initiation request commit atomically.
2. `executeInitiation()` atomically claims a `REQUESTED` attempt only.
3. Provider response:
   - accepted -> `PROVIDER_ACCEPTED`, payment `PROCESSING`;
   - definite rejection -> `DEFINITE_REJECTION`, payment `FAILED`, reservation released;
   - timeout/network/process exception -> `OUTCOME_UNKNOWN`, payment `VERIFICATION_REQUIRED`, reservation retained.
4. Stale `PENDING_PROVIDER` claims are never used to initiate a second provider session.
5. `reconcilePaymentInitiation()` claims stale or uncertain attempts and calls provider-supported `checkInitiation()` when available.
6. If lookup is unavailable, the attempt remains `RECONCILIATION_REQUIRED` and the reservation is preserved.

## Safety rules

- An application exception is not provider evidence.
- A timeout is not proof of rejection.
- A stale in-flight claim cannot initiate another provider session.
- A definite rejection requires explicit adapter classification via `definiteRejection`.
- Reservation release happens only through verified terminal provider evidence or definite initiation rejection.
- Provider-specific idempotent initiation/lookup remains adapter-specific and is not assumed.

## Covered disposable scenarios

- Definite synthetic provider rejection: payment `FAILED`, attempt `DEFINITE_REJECTION`, reservation `RELEASED`.
- Timeout before acceptance: payment `VERIFICATION_REQUIRED`, attempt `OUTCOME_UNKNOWN`, reservation `ACTIVE`.
- Timeout after acceptance: recovery finds accepted session without a second initiation call.
- Simulated crash after provider initiation: stale `PENDING_PROVIDER` lease reconciles through `checkInitiation()`.
- Unknown initiation outcome: reservation remains active and duplicate initiation is rejected.
- Generic terminal transitions cannot release reservations.

## Remaining limitations

- Real provider initiation lookup, idempotency and timeout semantics are still provider-specific.
- The test adapter can simulate accepted/unknown/rejected outcomes, but cannot prove AzamPay behavior.
- An operational sweeper for expired initiation leases is not implemented; `reconcilePaymentInitiation()` supplies the recovery path.

Status: **PASS for canonical lifecycle handling; BLOCKED for provider-specific production guarantees.**
