# Phase 1F Remediation Matrix

Date: 2026-11-06

Status: remediated in disposable scope; **not accepted** pending fresh independent review.

| Finding | Root cause | Correction | Regression evidence | Status |
|---|---|---|---|---|
| CRITICAL: delayed original definite rejection changed `SUCCESS` to `FAILED` while entitlement stayed active | Original provider-call completion did not prove it still owned the attempt or that payment state was eligible | `executeInitiation` assigns an owner; `persistAcceptedInitiation`, `rejectInitiation`, and `markInitiationUnknown` lock/reread attempt+payment, validate owner/status/lease/payment eligibility, and return stale results | Deterministic gateway delay; final state `SUCCESS`/`PROVIDER_ACCEPTED`/`active`; no `PAYMENT_FAILED` audit | Remediated in disposable |
| Delayed provider acceptance could overwrite newer state | Same unowned original completion path | Same ownership/state validation before persisting provider acceptance | `STALE_CLAIM`; `SUCCESS` and entitlement preserved | Remediated in disposable |
| Delayed `OUTCOME_UNKNOWN` could downgrade newer state | Same unowned original completion path | Same ownership/state validation before marking unknown | `STALE_CLAIM`; no failed/verification audit | Remediated in disposable |
| Exported initiation recovery lacked worker authentication | Direct calls bypassed the sweeper authentication boundary | `reconcilePaymentInitiation` requires active worker key/secret and audits the registered worker | Missing/wrong credentials rejected | Remediated in disposable |
| Exported refund recovery lacked complete worker boundary | Existing request could be recovered without worker credentials | Existing requests require `workerAuth`; first-time administrative creation remains administrative | Missing/wrong credentials rejected | Remediated in disposable |
| Worker could influence stored refund fields | Caller arguments were used for existing recovery | Stored request is authoritative for amount, allocations, reason, requester and manual metadata | Forged arguments rejected by outcome; completed refund preserved stored values | Remediated in disposable |
| Concurrent refund workers could deadlock | Payment→request and request→payment lock orders coexisted | Completion now uses payment→request order | Concurrent first requests and concurrent recovery complete without deadlocks or duplicate provider operations | Remediated in disposable |
| `007` was not safely rerunnable | Unconditional index/constraint operations could fail on second execution | Idempotent `IF NOT EXISTS`/guarded index handling | Two executions preserved all tested records | Remediated in disposable |
| `parent_case_id` lacked referential integrity | Recurrence column existed without a self-FK | `008_phase1f_integrity.sql` adds guarded `fk_reconciliation_parent` | Invalid parent insert rejected | Remediated in disposable |
| No authorized/auditable `finance_admin` grant path | Role assignment governance absent from inspected routes | Documented; no unsafe endpoint invented | Profile/general update paths inspected; no self-promotion path found, but governance remains absent | Open production blocker |
| Audit/financial transition consistency | Audit write could diverge from state transition | Relevant state+audit work remains transactional; refund completion uses consistent actor metadata | `REFUND_CONFIRMED` trigger rollback verified | Remediated in disposable |
