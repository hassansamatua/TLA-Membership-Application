# Phase 1B Remaining Risks

Date: 2026-11-02

## Status

Phase 1B remediation is implemented and verified in `phase1a_test`. It is ready for independent review, not self-accepted.

## Remaining risks

### BLOCKED

- AzamPay remains blocked pending official documentation and sandbox credentials.
- Provider-specific notification authenticity/signature verification cannot be claimed from the test adapter.
- Provider refund reconciliation for an ambiguous initiation failure without a provider reference requires provider-specific reconciliation and remains manual.
- Live payment API routes remain disabled and unimplemented for the canonical service.

### MEDIUM

- Refund provider operations currently execute sequentially inside `refundPaymentAllocations()` after durable request creation; an operational worker/reconciler is not implemented.
- `payment_notifications` now enforces event ID presence at service level; provider-specific rules for absent IDs must be confirmed before production integration.
- `payment_cycle_reservations` uses a fixed 30-minute expiry. This should be reviewed against actual provider checkout timeout.
- Membership projection still writes compatibility rows in legacy `memberships`/`cycle_payment_status`; canonical entitlements remain authoritative.
- `cycle_payment_status` uniqueness remains a legacy reconciliation task; service now avoids relying on absent uniqueness but the constraint is still absent.
- Structured audit stores event JSON but does not yet implement an external immutable audit sink.

### LOW

- Fixed synthetic reservation expiry and test gateway controls are appropriate for disposable tests but must be replaced by provider-specific configuration.
- Gateway registry immutability prevents runtime adapter replacement but does not by itself establish secure deployment configuration management.
- The repository still has broad pre-existing TypeScript/ESLint debt.
- Next.js build succeeds while skipping type validation due to existing configuration.

## Safety confirmations

- `next_auth` unchanged.
- No live payment endpoint enabled.
- No AzamPay integration attempted.
- Membership fees, penalties, grace periods, exemptions and cycle calculations unchanged.
- No production credentials or financial records used.

## Independent review focus

A fresh review should specifically test:

1. Reservation races beyond the implemented scenarios.
2. Settlement after reservation expiry with verified external success.
3. Refund recovery after process crashes at each outbox boundary.
4. Membership projection against legacy data variants.
5. Whether audit/event uniqueness is sufficient for the final provider contract.
