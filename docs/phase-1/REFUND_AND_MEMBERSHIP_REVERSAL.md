# Refund and Membership Reversal — Phase 1A

## Approved policy

A confirmed refund reverses only the membership-cycle entitlement funded by the refunded allocation. Other allocations and independently paid cycles remain active.

## Flow

```mermaid
sequenceDiagram
  participant A as Authorized administrator
  participant S as Payment service
  participant G as Gateway adapter
  participant D as Database

  A->>S: Refund selected paid allocations
  S->>D: Lock actor, payment and allocations
  S->>D: Verify admin actor, SUCCESS payment, PAID allocations and exact amount
  alt provider refund
    S->>G: initiateRefund()
    S->>G: verifyRefund()
  else manual refund
    S->>S: require approval reference + supporting evidence
  end
  S->>D: Insert payment_refunds and refund_allocations
  S->>D: Mark selected allocations REFUNDED
  S->>D: Reverse matching entitlements only
  S->>D: Recalculate membership projection
  S->>D: Audit actor and commit
```

## Safeguards

- Refund actor must exist and be an administrator.
- Original `SUCCESS` payment remains preserved.
- Refund is stored separately in `payment_refunds`; target cycles are stored in `payment_refund_allocations`.
- Only `PAID` allocations are refundable.
- Refund amount must exactly equal the selected allocation amount; partial-allocation refunds are out of scope.
- Duplicate refund is rejected because refunded allocations are no longer `PAID`.
- Provider refunds require adapter confirmation.
- Manual refunds require administrator actor, `manualApprovalId`, and supporting `evidence`; only an evidence hash is persisted.
- Provider/manual refund references are unique.
- Audit events store `actor_type`, `actor_id`, event hash, and timestamp.
- All-or-nothing transaction prevents a refund record without entitlement reversal.
