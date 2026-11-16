# Phase 1 Implementation Plan — Payment Integrity and Database Alignment

Date: 2026-11-02  
Status: proposed only. Awaiting explicit authorization before implementation.

## Executive summary

Phase 0 successfully contained unsafe payment activation by returning `503` for direct completion, simulated success, checkout, mobile-money, and callback paths. Investigation confirms the existing payment code is fragmented across multiple endpoints and cannot safely be re-enabled in its current form.

The recommended Phase 1 approach is:

1. Align the database minimally and reversibly.
2. Define a single canonical payment record and state machine.
3. Implement one server-authoritative membership-payment initiation path.
4. Implement one authenticated callback/status-verification path.
5. Activate memberships only inside one idempotent database transaction.
6. Add sandbox/simulated tests before enabling any live gateway flow.

No payment endpoint should be reactivated until official AzamPay callback/authentication and status-verification requirements are confirmed.

## Confirmed findings

### Database

- `users.user_category` is missing locally.
- `messages` is missing locally.
- Payment-related tables exist, but local schema inspection reports missing indexes/foreign keys on key payment and membership tables.
- `payments.reference` exists but uniqueness is not currently enforced in the inspected schema.
- Payment and membership status vocabularies are inconsistent.
- `database/add_user_categories_and_update_membership.sql` bundles the required column with unrelated fee, penalty, and membership-number changes and should not be applied unchanged.
- `database/create_messages_table.sql` is an additive low-risk candidate after syntax/compatibility review.

### Payments

- Multiple paths can mark payment/membership completed.
- Several paths trust client-supplied amount/reference/status.
- `lib/mobile-money.ts` is a simulator and cannot be used for verified production payment completion.
- `updateMembershipPayment()` is not a safe payment settlement boundary: callers may pass status/amount and it does not enforce a canonical verified gateway result.
- Current local schema lacks constraints needed to prove idempotency under concurrency.

### Security/quality issues retained from Phase 0

- TypeScript checks fail broadly.
- ESLint fails broadly.
- Email delivery has not been verified.
- Sensitive repository history/files need authorized cleanup.
- Build success is not a complete quality gate because TypeScript build errors are ignored.

## Proposed implementation sequence

### Step 0 — decision gate

| Decision | Classification |
|---|---|
| Approve additive `user_category` migration | REQUIRES APPROVAL |
| Approve additive `messages` migration | REQUIRES APPROVAL |
| Approve payment constraint/state migration design | REQUIRES APPROVAL |
| Select AzamPay as sole Phase 1 provider | REQUIRES APPROVAL |
| Confirm refund/reversal business rules | REQUIRES APPROVAL |
| Obtain official AzamPay docs + sandbox access | BLOCKED |

### Step 1 — schema baseline

Implement only after approval:

1. Add `users.user_category` as `ENUM('librarian','organization','regular') DEFAULT 'regular'` and index it.
2. Create `messages` with sender/receiver FKs and indexes.
3. Audit duplicate payment references/user-cycle records before adding unique constraints.
4. Add constraints/indexes after data review:
   - `payments.reference` unique
   - `payments.transaction_id` unique where non-null
   - `payments.user_id` FK
   - `memberships.user_id` unique
   - `membership_payments.reference` unique
   - `cycle_payment_status(user_id, cycle_year)` unique
   - `user_membership_status.user_id` unique
5. Introduce canonical payment lifecycle columns or a normalized `payment_transactions` table. Do not rewrite business fee logic.

**Rollback:** reverse additive columns/tables/indexes; retain auditable backup of any pre-migration duplicate findings.

### Step 2 — payment domain boundary

Create a single internal settlement service with no public HTTP exposure:

- `createMembershipPaymentIntent(memberId, selection)`
- `initiateGatewayPayment(intent)`
- `recordGatewayNotification(raw event)`
- `verifyAndSettlePayment(reference/gatewayId)`
- `activateVerifiedMembershipPayment(paymentId)`

Rules:

- Server derives member ID from auth token.
- Server derives amount/currency/cycles from existing membership rules.
- Client cannot provide success status, transaction ID, amount, or user ID.
- All settlement writes occur in one DB transaction with row locks.
- Notification/audit events are stored without secrets or unnecessary personal data.

### Step 3 — AzamPay integration

Blocked until official documentation is supplied.

Implementation must confirm and then implement:

- Authenticated checkout initiation.
- Correct app reference/external reference.
- Callback authenticity verification.
- Authoritative transaction status lookup.
- Exact provider/channel mapping.
- Currency and amount units.
- Expiry/cancellation/refund semantics.
- Retry/idempotency behavior.

If the official gateway supports signed callbacks plus status lookup, callback data should trigger verification, not directly authorize settlement.

### Step 4 — controlled endpoint re-enablement

Keep existing dangerous routes unavailable. Prefer new narrow endpoints:

- `POST /api/payments/membership/initiate` — authenticated member.
- `POST /api/payments/azampay/callback` — gateway only; no session requirement.
- `GET /api/payments/membership/status` — member own status.
- Admin refund/status endpoints only after explicit rules.

Do not simply unblock old `/api/membership/pay`, `/payment-success`, `/complete`, mobile-money, or test endpoints.

### Step 5 — frontend integration

- Display server-computed amount and payable cycles before initiation.
- Redirect/open provider checkout using server response.
- Poll own payment status or display pending result.
- Never submit success state, amount, transaction ID, or activation request.
- Show pending/failure/cancelled states distinctly.

### Step 6 — verification and rollout

1. Unit/state-machine tests.
2. Mocked gateway tests.
3. Concurrent/idempotency tests.
4. Disposable schema migration test.
5. Sandbox test using official AzamPay procedure.
6. Admin/member authorization regression.
7. TypeScript/lint remediation for changed files.
8. Limited non-production rollout.
9. Production approval only after documented sandbox evidence.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Official callback spec unavailable | Keep payments disabled; BLOCKED |
| Duplicate callbacks | unique transaction/reference + atomic claim |
| Race between initiation and callback | `PROCESSING`/`VERIFICATION_REQUIRED`; row locks |
| Existing duplicate data prevents constraints | audit first; remediation plan required |
| Legacy `completed` state conflicts | explicit mapping and migration |
| Schema migrations change fee rules | split unrelated updates; do not apply bundled migration |
| Multi-cycle payments | require business confirmation on one transaction covering multiple cycles |
| Refund after activation | require approved revocation/accounting rule |
| Gateway outage | fail closed and retry verification; never activate |
| Provider simulation leaks into production | remove simulated success behavior from production paths |

## Required approvals before implementation

1. Approve minimal schema migration for `user_category`.
2. Approve additive `messages` table migration.
3. Approve payment schema constraint/state migration.
4. Confirm AzamPay is the intended provider and provide official docs/sandbox credentials.
5. Confirm whether PesaPal/direct mobile-money remain in scope.
6. Confirm multi-cycle payment and refund business rules.
7. Approve replacing fragmented payment paths with one server-side settlement service.

## Definition of Phase 1 done

- Approved schema baseline applied in disposable/staging environment.
- No client-declared payment success path.
- Canonical payment state machine and constraints enforced.
- Official gateway authentication and status verification implemented.
- Idempotent settlement proven under duplicate/concurrent callbacks.
- Membership activation occurs only after verified success.
- Failed/cancelled/pending/expired states cannot activate membership.
- Security regression and mocked/sandbox tests pass.
- Remaining TypeScript/lint quality issues are documented, with no new regressions.

## Final status

| Area | Classification |
|---|---|
| Current unsafe payment containment | VERIFIED |
| Current DB schema mismatch | VERIFIED |
| Payment architecture requires consolidation | VERIFIED |
| Minimal migration strategy | REQUIRES APPROVAL |
| Payment constraints/state migration | REQUIRES APPROVAL |
| AzamPay implementation | BLOCKED pending official docs/credentials |
| Payment endpoint reactivation | REQUIRES APPROVAL — currently unsafe |
| Production readiness | BLOCKED |
