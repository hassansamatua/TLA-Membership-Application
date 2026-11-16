# Phase 1D Audit Controls

Date: 2026-11-04

Status: implemented and disposable-verified; not independently accepted.

`payment_audit_events` records event type, actor type/ID, event hash, correlation ID, structured event data and timestamp. Relevant events include `LEASE_CLAIMED`, `LEASE_RENEWED`, `LEASE_EXPIRED`, `RECOVERY_ATTEMPTED`, `RECOVERY_SUCCEEDED`, `RECOVERY_FAILED`, `RECONCILIATION_ASSIGNED`, `RECONCILIATION_ESCALATED`, `RECONCILIATION_RESOLVED`, `MANUAL_REFUND_APPROVED`, and `MANUAL_REFUND_REJECTED`.

## Atomicity evidence

- Case claims, renewals, escalations and resolutions write state plus audit in one transaction.
- Disposable trigger failures verified rollback:
  - claim remained `OPEN` with no owner;
  - renewal rollback preserved the entire case row and removed the preceding assignment audit insert;
  - escalation rollback preserved the entire case row.
- Trigger cleanup uses `finally` blocks and the disposable suite is executed sequentially to avoid cross-test trigger overlap.

## Recovery evidence

- Unscoped mixed work recorded failure evidence with exact refund request ID.
- Deferred retry was not attempted before `next_attempt_at`.
- Repeated scoped sweeps attempted zero completed items.
- Per-item failure increments retry/backoff metadata without blocking the unrelated eligible operation.
- Audit-write failures are counted in `auditFailed`; prerequisite evidence failure prevents that item's external recovery and the sweep continues.

## Limitations

Audit storage remains local to the application database, not an external immutable sink. Error text may include provider/error details and needs an operational sensitivity review before wider use. The sweep result exposes audit failure counts, but no durable dead-letter record is possible while audit insertion itself is unavailable.
