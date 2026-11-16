# Phase 1E Remaining Risks

Date: 2026-11-04

Phase 1E implementation and disposable verification are complete, but **Phase 1E is not accepted**. A fresh independent security review remains mandatory before acceptance, provider integration, endpoint activation, scheduler deployment, or production use.

## Confirmed remaining limitations

1. **Repository TypeScript baseline remains failed.** `npx tsc --noEmit --pretty false` produced 340 diagnostic lines across generated route constraints, legacy API/auth code, components, `app/scripts`, and malformed `lib/db-utils.ts`.
2. **Repository ESLint baseline remains failed.** `npm run lint` produced 673 problems: 451 errors and 222 warnings. Focused payment lint is clean.
3. **Build does not prove type safety.** `npm run build` passed and generated 144 pages, but the configured build explicitly skipped type validation.
4. **Disposable schema is shared.** Payment tests must execute sequentially because concurrent files can interfere through `phase1a_test`.
5. **Worker boundary is service-level.** The authenticated `payment_recovery_workers` table and credential check exist, but there is no deployed scheduler, worker process manager, network boundary, credential rotation process, or operating-system secret store.
6. **Worker credentials are test fixtures.** The disposable test registers a worker key/hash directly. Production credential issuance and revocation governance are undefined.
7. **Audit storage remains local.** There is no external immutable sink. If audit persistence is unavailable, transitions roll back, but no durable dead-letter record can exist.
8. **Provider semantics remain unknown.** AzamPay and real provider initiation/status/refund/callback/idempotency semantics were not implemented or inferred.
9. **Manual evidence handling remains limited.** Evidence hashes exist, but controlled evidence storage, retention, and access policies are not implemented.
10. **Role administration is only partially verified.** Reconciliation administration now requires `role='finance_admin'`, and inspected profile/general user paths do not write `role`; however a comprehensive authorization review of every administrative route remains outside this disposable phase.
11. **Query plans still need optimization at scale.** Existing bounded sweep indexes are in place, but earlier evidence showed filesort behavior that may become material at high volume.
12. **Monitoring is absent.** There is no metrics, alerting, reconciliation aging dashboard, dead-letter queue, or operational runbook.
13. **Transient deadlock handling is bounded.** The sweeper retries one deadlock once; persistent lock contention or provider uncertainty still requires reconciliation.
14. **Recurrence schema is disposable.** `007_phase1e_remediation.sql` was applied only to `phase1a_test`; no migration is authorized for staging or production.
15. **No HTTP/admin UI authorization claim is made.** Service-level checks were verified; no payment endpoint or administrative UI was activated or reviewed as an exposed attack surface.
16. **Provider-confirmed local completion depends on request ownership.** The current contract binds completion to `claim_owner`; operator recovery must preserve the request/claim row if manual intervention is needed.
17. **Refund retry exhaustion needs operator workflow.** Requests reaching `MAX_RECOVERY_ATTEMPTS` stop automatically, but there is no dedicated dead-letter case type or escalation policy for exhausted work.
18. **Payment notification persistence is still after settlement.** This pre-existing non-atomic boundary remains a later remediation candidate.

## What changed in risk posture

- The reproduced stale reconciliation downgrade now returns `STALE_PAYMENT_STATE` or `STALE_CLAIM` and cannot overwrite `SUCCESS`.
- Missing, malformed, or mismatched member identity cannot settle.
- A resolved case no longer hides a subsequent unresolved event.
- Sweep execution requires authenticated worker credentials and cannot accept a supplied audit actor ID.
- Ordinary `is_admin=1` users cannot manage reconciliation cases unless they also have `role='finance_admin'`.
- Recovery retry limits/backoff are enforced inside claim operations.
- Audit-write failure in initiation/refund recovery rolls back the associated transition.
- Audit event names now distinguish queueing, expiry, retry, success, inconclusive outcome, stale claim, and failure.

## Required before sandbox/provider work

- Define official provider identity fields, callback authentication, idempotency, refund status, and timeout semantics.
- Define and provision real worker credentials without embedding secrets in tests.
- Add an external immutable audit destination or equivalent controlled retention.
- Add operational monitoring, dead-letter handling, and reconciliation aging alerts.
- Define finance-admin role assignment and review controls.
- Add controlled manual evidence storage.
- Run an exposed-route authorization review before enabling any payment/reconciliation endpoint.

## Explicit restrictions preserved

No production access, staging/production migration, `next_auth` modification, payment endpoint activation, live payment/refund, AzamPay integration, scheduler/worker deployment, credential disclosure, or membership fee/penalty/exemption/grace-period change occurred.

Phase 1E stops here for a fresh independent security review.
