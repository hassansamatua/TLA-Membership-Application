# Phase 1D Reconciliation Workflow

Date: 2026-11-04

Status: implemented and disposable-verified; not independently accepted.

## Authorization and ownership

Listing, detail access, claiming, escalation and resolution require `requireFinanceAdmin`. Ordinary members were rejected.

Claims bind administrator ID and worker ID to a lease under a case lock. `OPEN` becomes `ASSIGNED`; a claimed escalated case retains `ESCALATED` status. An active claim cannot be used by another worker or displaced by another administrator. Expired claims cannot resolve or escalate.

Escalation requires the current active owner, records reason/time, atomically clears ownership and lease, and preserves escalation history. An escalated case can be claimed after release or lease expiry. While an escalated claim is active, takeover is rejected.

Resolution requires matching administrator/worker and an unexpired lease. It records decision, reason and resolver; it does not set payment success, confirm refunds, alter entitlements, or modify membership state.

## Verified workflow

- Unauthorized member listing/detail rejected.
- Initial admin claim accepted.
- Competing worker/admin claim rejected.
- Expired owner rejected for resolution and escalation.
- Second admin reclaimed after expiry.
- Prior admin immediately lost authority.
- Audit failure rolled back claim, renewal and escalation state.
- Escalation cleared ownership and retained reason.
- Released and expired escalated cases were reclaimable.
- Active escalated takeover rejected.
- Resolution preserved payment and refund-request status.
- Case detail exposed payment reference, allocations, refund requests and audit events under finance-admin authorization.

No administrative UI or HTTP payment endpoint was activated.
