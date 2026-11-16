# Phase 1A Remaining Risks

Date: 2026-11-02

## Blocking items

- AzamPay remains `BLOCKED`: official callback authentication, checkout/status schemas, sandbox credentials, reference semantics, retries, expiry and refund behavior are unavailable.
- Live payment endpoints remain disabled. Phase 0 `503` containment is still active for unsafe legacy payment paths.
- `next_auth` was not migrated. Canonical Phase 1A tables exist only in disposable `phase1a_test`.
- Legacy payment tables still need duplicate/orphan/constraint reconciliation before production migration.

## Corrected security issues

- `transitionPayment()` previously allowed direct `PROCESSING -> SUCCESS`; this was corrected. Only `settlePayment()` can establish `SUCCESS`.
- `TestPaymentGateway` could previously be registered without a production guard; it is now rejected when `NODE_ENV=production`.
- Notification records are now inserted after successful settlement, so a crash does not consume a retryable provider event.
- Provider transaction IDs and provider refund references now have canonical uniqueness constraints.
- Refund actors must exist and be administrators; manual refunds require approval reference and evidence.

## Partial verification/risks

- Multi-process tests cover settlement, same-event notifications, different-event notifications, and duplicate refunds. Broader gateway timeout/retry storm behavior is not covered.
- Failure injection covers rejected verification, invalid transition, expiry, duplicate transaction rollback, and unconfirmed refund rollback. Deep mid-transaction failures still depend on DB transaction semantics rather than a dedicated fault-injection framework.
- Manual refund success is tested in the disposable schema. The operational approval workflow and secure evidence storage location are not yet productized.
- Canonical membership projection updates legacy `memberships`/`cycle_payment_status`, but all legacy views were not exhaustively reconciled.
- Payment service is not exposed through an API yet; authorization, request validation and rate limiting still need implementation when routes are authorized.
- Partial allocation refunds are intentionally unsupported.
- `listFutureUnpaidCycles()` currently supplies current plus two future cycles. Longer multi-cycle checkout would require business approval.

## Quality debt

- Repository-wide TypeScript still fails: 340 output lines, mostly pre-existing route typing and broken `lib/db-utils.ts`.
- Repository-wide ESLint still fails: 673 findings (451 errors, 222 warnings), consistent with prior quality debt.
- Production build passes but skips type validation because of existing `next.config.js` behavior.
- Sensitive repository files/history cleanup remains unresolved.
- The explicit `.ts` import compatibility required `allowImportingTsExtensions` in `tsconfig.json`; this is configuration-only and does not change business rules.

## Recommended next steps

1. Review and approve the canonical migration plan for a fresh staging clone.
2. Obtain official AzamPay documentation and sandbox credentials.
3. Design narrow payment APIs that call the central service and preserve Phase 0 authorization.
4. Add provider-specific sandbox tests and reconciliation jobs.
5. Expand fault injection for gateway timeout and partial provider failure scenarios.
