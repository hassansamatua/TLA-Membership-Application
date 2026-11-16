# Phase 1E Independent Security Review

Date: 2026-11-06

## Executive verdict

**REJECTED — Phase 1E is not accepted.**

Independent reproduction confirmed that the original Phase 1D defects were remediated by the Phase 1E implementation, but review also identified a new **CRITICAL** stale-operation race in the original provider-initiation completion path. Phase 1E therefore cannot be accepted.

A narrowly scoped Phase 1F remediation has since been implemented and verified in the disposable database. This report does **not** accept Phase 1F; a fresh independent review remains mandatory.

## Source and reports inspected

- `lib/payments/service.ts`
- `lib/payments/gateways.ts`
- `tests/payment-operations.test.mjs`
- `tests/payment-concurrency.test.mjs`
- `tests/payment-lifecycle.test.mjs`
- `tests/payment-foundation.test.mjs`
- `tests/payment-validation.test.mjs`
- `tests/phase1a-worker.mjs`
- `migrations/phase1a/006_payment_operations_reconciliation.sql`
- `migrations/phase1a/007_phase1e_remediation.sql`
- `migrations/phase1a/008_phase1f_integrity.sql`
- `PHASE_1E_IMPLEMENTATION_REPORT.md`
- `PHASE_1E_TEST_RESULTS.md`
- `PHASE_1E_REMEDIATION_MATRIX.md`
- `PHASE_1E_REMAINING_RISKS.md`
- `PHASE_1D_INDEPENDENT_SECURITY_REVIEW.md`
- Phase 1F remediation/test reports created after the finding

## Original Phase 1D defect reproduction

| Original defect | Independent result |
|---|---|
| Delayed reconciliation `OUTCOME_UNKNOWN` downgraded concurrent `SUCCESS` | Remediated in Phase 1E; stale worker returned `STALE_PAYMENT_STATE`, payment remained `SUCCESS`, entitlement remained active |
| Missing/mismatched `memberReference` could settle | Remediated; missing, malformed, and mismatched identities are rejected to reconciliation and no entitlement activates |
| New unresolved refund disappeared after prior resolved case | Remediated; a linked `OPEN` recurrence with a new subject and `parent_case_id` appears in the unresolved queue |

## New CRITICAL finding reproduced during Phase 1E review

### Stale original initiation result overwrote successful financial state

Observed sequence:

1. Original initiation request remained pending.
2. Recovery worker took over and confirmed provider acceptance.
3. Payment settled as `SUCCESS`.
4. Entitlement became `active`.
5. Original request later returned a delayed definite rejection.
6. Final payment became `FAILED`, initiation attempt became `DEFINITE_REJECTION`, and the entitlement remained `active`.

Root cause: `rejectInitiation`, `markInitiationUnknown`, and original accepted-initiation persistence did not revalidate the original operation's ownership under the final database lock after newer recovery/settlement state existed.

Phase 1F remediation now binds original provider work to a claim owner, locks/rereads payment and attempt state, validates owner/status/lease/payment eligibility, and returns `STALE_CLAIM` or `STALE_PAYMENT_STATE` without changing `SUCCESS` or the entitlement. Disposable tests cover delayed definite rejection, delayed provider acceptance, and delayed `OUTCOME_UNKNOWN` after successful recovery and settlement.

## Other findings identified during review

| Finding | Severity | Phase 1F status |
|---|---:|---|
| Exported initiation/refund recovery functions could be invoked outside authenticated sweeps | High | Remediated in disposable service boundary; fresh review required |
| Stored refund request authority could be influenced by recovery-call arguments | High | Remediated; stored amount, allocations, reason, and requester are authoritative |
| Payment/request lock-order inconsistency could deadlock refund recovery | High | Remediated by consistent payment→request locking |
| `007` migration was not fully rerunnable | Medium | Remediated for disposable schema; verified twice with record preservation |
| `parent_case_id` lacked a foreign key | Medium | Remediated by `008_phase1f_integrity.sql`; invalid parent rejected |
| No authorized, auditable `finance_admin` grant/revoke process exists | High | Open; documented as production blocker, no unsafe endpoint created |
| No deployed worker credential lifecycle/rotation | High | Open |
| No immutable external audit sink | Medium | Open |
| Real provider verification/idempotency semantics unverified | High | Open; AzamPay remains blocked |
| Repository TypeScript baseline fails | Medium | Open; 340 diagnostic lines |
| Repository ESLint baseline fails | Medium | Open; 451 errors, 222 warnings |
| Build skips type validation | Medium | Open; build success is limited evidence |

## Authorization review

- `role='finance_admin'` is required for reconciliation administration; ordinary `is_admin=1` users are denied in disposable tests.
- `sweepPaymentLeases`, direct initiation recovery, and existing refund recovery require active worker credentials.
- Worker audit records use `actor_type='recovery_worker'` and the authenticated worker ID, not a caller-supplied `actorId`.
- Workers cannot impersonate finance administrators through the service arguments inspected.
- Profile/general user-update inspection found no ordinary self-promotion path writing `users.role`.
- However, no governed `finance_admin` grant/revoke workflow was found; this remains unresolved.

## Verification evidence after Phase 1F

| Check | Result |
|---|---|
| Five sequential disposable suites | 5/5 passed, 0 failed |
| Expanded operations suite | Passed |
| Isolated concurrency suite | Passed |
| Standard `npm test` | 6 passed, 5 expected disposable skips, 0 failed |
| Focused TypeScript | Passed |
| Focused ESLint | Passed |
| Repository TypeScript | Failed; 340 diagnostic lines |
| Repository ESLint | Failed; 451 errors, 222 warnings |
| Production build | Passed; type validation skipped |
| `git diff --check` | Passed |
| `007` second execution | Passed; no record loss observed |
| Invalid `parent_case_id` | Rejected by `fk_reconciliation_parent` |

## Decision and required next step

Phase 1E remains **REJECTED** because the independently reproduced critical stale-original-initiation defect existed in the reviewed implementation.

Phase 1F remediation has been implemented against the disposable database and its requested verification passed, but **Phase 1F is not accepted by this report**. A fresh independent security review must reproduce all delayed original outcomes, direct worker authorization behavior, stored refund authority, locking/concurrency behavior, migration integrity, and audit rollback before any disposable acceptance decision is made.
