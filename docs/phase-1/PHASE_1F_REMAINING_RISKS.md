# Phase 1F Remaining Risks

Date: 2026-11-06

Status: risks documented; **no acceptance or production-readiness claim is made.**

## Blocking for production readiness

1. **Finance-admin role governance absent** — no authorized and auditable grant/revoke process for `finance_admin` was found. Disposable authorization checks are not a substitute for lifecycle governance.
2. **Worker deployment and credential lifecycle absent** — disposable key/secret verification exists, but there is no scheduler, managed worker principal, rotation, revocation workflow, or network boundary.
3. **Provider semantics unverified** — real initiation, timeout, callback, refund, idempotency and member-identity semantics remain untested. AzamPay remains blocked.
4. **Repository TypeScript fails** — 340 diagnostic lines remain across generated route validation and unrelated application code.
5. **Repository ESLint fails** — 451 errors and 222 warnings remain.
6. **Build bypasses type validation** — the production build generated 144 pages but explicitly skipped type validation.
7. **No immutable external audit sink** — audit rows remain local database records.
8. **Disposable shared database requires sequential suite execution** — parallel file scheduling can create unrelated lock/claim interference.

## Operational limitations

- Recovery functions are protected at the service boundary, but there is no deployed transport authorization layer.
- `007` has no rollback migration; schema corrections must remain forward-only.
- `008` only guards/adds the parent foreign key; existing non-disposable data would need separate validation before applying an equivalent migration elsewhere.
- Original initiation APIs still surface a returned initiation object to the caller even when it reports a stale-operation result; downstream callers must treat explicit stale results as non-authoritative.
- Local audit rows are transactional, but audit tamper resistance depends on database controls not established here.
- Refund authority checks prove persisted request fields are authoritative in the disposable service path; any future endpoint must not bypass this service boundary.

## Explicitly not authorized

- Production or staging migration/access.
- `next_auth` changes.
- Live payments or refunds.
- AzamPay integration.
- Endpoint activation.
- Scheduler or worker deployment.
- Membership fee, penalty, exemption or grace-period changes.

A fresh independent security review remains mandatory before Phase 1E/1F can be accepted even for continued disposable development.
