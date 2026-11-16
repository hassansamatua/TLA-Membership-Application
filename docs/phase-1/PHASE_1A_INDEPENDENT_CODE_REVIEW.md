# Phase 1A Independent Code Review and Acceptance Gate

Date: 2026-11-02  
Reviewer role: independent security, architecture, database-integrity and regression review.  
Scope: Phase 0 diff, `lib/payments`, `migrations/phase1a`, tests, `tsconfig.json`, `package.json`, and Phase 1A documentation.  
Database access: schema/test verification only in `phase1a_test`; `next_auth` was inspected read-only and remains unchanged.

## Executive assessment

**Overall status: REJECTED**

The payment foundation is a useful prototype and the included tests pass, but independent review found security and financial-integrity defects that contradict several Phase 1A acceptance requirements. Most importantly:

1. Two separate payments for the same member cycle can both settle and charge the member twice.
2. `transitionPayment()` still permits direct `SUCCESS -> REFUNDED`, bypassing refund authorization, provider/manual confirmation, refund records, allocation reversal, and entitlement reversal.
3. `settlePayment()` accepts a caller-supplied provider code instead of enforcing the provider stored on the payment.
4. Payment initiation accepts an arbitrary `memberId` and does not establish the caller's authenticated identity or approval status.
5. Gateway/provider verification is optional in places where transaction identity should be mandatory.
6. Provider refunds are invoked inside a database transaction; if local rollback occurs after provider confirmation, gateway and ledger state diverge.

These are not theoretical issues. The same-cycle double settlement and refund-state bypass were reproduced in `phase1a_test`.

## Reproduction evidence

A synthetic member created two separate payment intents for cycle 2026 before either settled. Both test-gateway settlements returned `SUCCESS`.

Observed state:

- Both `payment_transactions` rows became `SUCCESS`.
- Both `payment_cycle_allocations` rows became `PAID`.
- One `membership_cycle_entitlements` row existed and pointed to the second allocation because the unique `(user_id, cycle_year)` row was overwritten by the later `ON DUPLICATE KEY UPDATE`.
- `cycle_payment_status` contained two rows because the inspected legacy table has no `(user_id, cycle_year)` unique key.
- `transitionPayment(paymentId, 'REFUNDED', 'admin')` was accepted and changed the original payment status to `REFUNDED` without creating refund allocations or reversing the entitlement.

This proves double-charge/double-allocation risk and a refund authorization bypass.

## Critical and high findings

### CRITICAL — Duplicate payments can fund the same cycle

**Finding:** `membership_cycle_entitlements` has `UNIQUE(user_id, cycle_year)`, but settlement uses `ON DUPLICATE KEY UPDATE` to replace the existing `payment_allocation_id`. A second successful payment for the same cycle overwrites the entitlement linkage instead of being rejected or reconciled.

Contributing causes:

- `createPaymentIntent()` checks cycle eligibility at quote time, not under a cycle-level lock/reservation.
- Two intents can be created while the cycle is unpaid.
- `settlePayment()` does not verify that the cycle is still unfunded by a different payment before granting entitlement.
- `payment_cycle_allocations` has no uniqueness spanning `(payment.user_id, cycle_year)` for open/paid funding attempts.
- `cycle_payment_status` lacked a unique `(user_id, cycle_year)` constraint in the inspected disposable schema, so duplicate rows were inserted.

**Impact:** the same membership cycle can be paid twice. Financial history preserves both payments, but only the later payment controls the entitlement projection. Refund of the first may not reverse the entitlement now linked to the second.

**Required correction:** reserve eligible cycles during intent creation or lock and recheck entitlement/paid status inside settlement. Settlement must reject or safely reconcile a cycle already funded by another verified payment. Add DB constraints/claim rows that make a second funded cycle impossible.

### CRITICAL — Generic transition bypasses refund controls

**Finding:** `transitionPayment()` allows `SUCCESS -> REFUNDED`. It updates only `payment_transactions.status`/`refunded_at` and writes an audit row; it does not validate actor authority, provider/manual confirmation, refund amount, allocations, evidence, or membership reversal.

**Impact:** a caller with access to the exported helper can mark a payment refunded while entitlements remain active and no refund record exists. This violates the approved refund policy and financial history requirements.

**Required correction:** remove `SUCCESS -> REFUNDED` from generic transitions. Refund status may only be changed by `refundPaymentAllocations()` after validated refund allocations are committed. Consider splitting lifecycle transitions from financial settlement/refund operations entirely.

### HIGH — Settlement accepts caller-selected provider instead of payment provider

**Finding:** `settlePayment(paymentId, providerCode, actor)` uses the supplied `providerCode` to select the gateway. `processGatewayNotification()` also forwards the caller-selected provider code. Neither verifies `payment.provider_code` before verification/settlement.

**Impact:** in non-production or any future route that accepts provider input, a caller could attempt to settle a payment through the wrong adapter. In production the test adapter is blocked, but the design still separates verification authority from the persisted provider.

**Required correction:** derive `providerCode` exclusively from the locked `payment_transactions.provider_code`. Reject mismatches between callback provider, stored provider and settlement adapter.

### HIGH — Payment initiation does not establish authenticated member identity

**Finding:** `createPaymentIntent()` accepts `memberId` as an argument and only checks it is nonzero. It does not verify that the authenticated caller is that member, that the user exists, or that the member is approved/active before cycle quoting. The FK catches a nonexistent user at insert time, but not impersonation or unapproved-member intent.

**Impact:** once exposed through a route, careless callers can initiate payments for another member or an ineligible member.

**Required correction:** accept an authenticated member context/ID established by `requireUser()`, verify `users.is_approved`, and reject mismatched member IDs. Do not accept `memberId` from client input.

### HIGH — Provider transaction identity is optional

**Finding:** `GatewayVerification.providerTransactionId` is optional and `settlePayment()` allows success without one. Although provider reference, amount, currency and optional member reference are checked, no transaction identity is required before financial effects.

**Impact:** weakens duplicate detection and reconciliation against provider records.

**Required correction:** make provider transaction identity mandatory for providers that expose one, or explicitly document and enforce an approved alternative unique settlement key.

### HIGH — Provider refund can diverge from ledger on rollback

**Finding:** `initiateRefund()` and `verifyRefund()` are called inside the local DB transaction. If provider refund succeeds but a later local insert/update fails, local payment/entitlement changes roll back while the provider refund may already have occurred.

**Impact:** money can be refunded externally while canonical records still show paid entitlements.

**Required correction:** use a refund intent/outbox and reconciliation flow: create `PENDING` refund record locally, invoke provider, then record confirmed/refund-failed state and retry/reconcile. Do not hold DB locks across external network calls.

### HIGH — Unapproved/unknown member and cycle eligibility are not locked

**Finding:** quote lookup reads `listFutureUnpaidCycles()` using a separate pool connection inside `createPaymentIntentOnce()`, while the outer transaction uses another connection. Eligibility checks are therefore outside the same transaction/lock boundary.

**Impact:** concurrent intents can both see a cycle as unpaid and proceed to settlement.

**Required correction:** perform eligibility checks with the same transaction connection, lock the relevant user/cycle rows, and recheck before committing allocations and again before settlement.

## Medium findings

### MEDIUM — Membership projection creates non-authoritative membership data

`refreshMembershipProjection()` hardcodes `membership_type='personal'` and generates a membership number as `TLA{yy}{zero-padded userId}`. This does not use `generateMembershipNumber()` and may be wrong for organization members or membership-number sequencing. If no membership row exists, the projection can create an incorrect canonical-looking membership.

### MEDIUM — Refund can erase independently paid cycle state

Refund reverses `cycle_payment_status` for `(user_id, cycle_year)` without checking which payment/reference funded it. If duplicate or legacy paid records exist, refunding one allocation can mark the whole cycle unpaid even though another valid payment remains.

### MEDIUM — Generic transitions lack authorization boundaries

`transitionPayment()` accepts an arbitrary actor string and permits `FAILED`, `CANCELLED`, `EXPIRED`, and `PROCESSING` transitions without distinguishing system/provider/admin operations. Even after removing `SUCCESS`/`REFUNDED`, it should be restricted or renamed as an internal trusted transition function.

### MEDIUM — Notification event uniqueness is scoped incorrectly

`payment_notifications` uses `(payment_id, provider_event_id)`. Provider event IDs should normally be unique per provider globally, not only per payment, to detect replay or misrouted events across payments.

### MEDIUM — Notification persistence remains eventually consistent

Notification rows are inserted after settlement. A crash between settlement and notification insert correctly prevents duplicate financial effects, but permanently loses that provider-event processing record unless another audit path captures it.

### MEDIUM — Manual evidence is reduced to a hash only

`evidence_hash` supports integrity, but the approval evidence itself is not stored or referenced to controlled storage. Operational review may be impossible if the source evidence is unavailable.

### MEDIUM — Audit event stores only a hash of event details

`payment_audit_events.event_hash` is useful for tamper evidence but does not retain structured action details. Reconstructing what changed requires external context.

### MEDIUM — Legacy `ON DUPLICATE` assumptions do not match inspected schema

Settlement uses `ON DUPLICATE KEY UPDATE` on `cycle_payment_status`, but the inspected schema reported no unique `(user_id, cycle_year)` key. The code therefore inserts duplicate rows instead of deduplicating.

### MEDIUM — Organization membership projection may be wrong

Payment allocations do not carry membership type/category; refresh inserts `personal` for new memberships. This conflicts with `user_category`/`membership_type` distinctions.

### LOW — Gateway registry is mutable

`registerGateway()` can replace any registered provider, including `azampay`, except for the special `test-gateway` production guard. Application code paths do not currently expose registration, but the registry should be immutable after bootstrapping or provider allowlisted.

### LOW — Provider event ID is optional

A notification without `providerEventId` can still trigger settlement. State idempotency prevents duplicate financial effects, but event-level traceability is weaker.

### LOW — Nullable unique columns are acceptable but need review

MySQL permits multiple NULL values in unique keys for provider reference/transaction/refund fields. This is correct for optional values but means uniqueness only exists when values are present.

## Verified safe/acceptable findings

### INFORMATIONAL — Direct `SUCCESS` transition is blocked

The corrected transition map removes direct transitions to `SUCCESS`; test evidence proves even an `admin` actor is rejected.

### INFORMATIONAL — Settlement validates core financial fields

`settlePayment()` checks provider reference, amount, currency, optional member reference, expiry, normalized provider state, payment state, provider transaction uniqueness, allocation status and creates entitlements inside a transaction.

### INFORMATIONAL — Unsafe legacy routes remain unavailable

`lib/api-access.ts` still classifies legacy payment-completion, checkout/callback, mobile-money, PesaPal, payment-success and cleanup routes as unavailable. The new payment service is not exposed by a route.

### INFORMATIONAL — Test gateway is production-blocked

`registerGateway()` rejects `test-gateway` when `NODE_ENV=production`, and the test verifies this. It should additionally require an explicit disposable-test flag for defense in depth.

### INFORMATIONAL — Business rules were not changed

`lib/enhancedMembershipCycles.ts` has only an import extension change in the diff. Fees, penalty math, exemptions and cycle dates were not modified. The observed 40,000/30,000 amounts are outputs of the existing cycle engine for a new regular member, not new fixtures.

### INFORMATIONAL — `next_auth` remains unmodified

Read-only inspection confirms `next_auth` still lacks `user_category`, `messages`, and `payment_transactions`. Phase 1A schema exists only in `phase1a_test`.

## Database integrity review

### Strengths

- Appropriate `DECIMAL(12,2)` fields.
- `CHAR(3)` currency.
- Internal reference, idempotency key, provider reference and transaction uniqueness.
- Explicit payment/allocation/notification/refund/entitlement relationships.
- Refund allocations preserve per-cycle reversal detail.
- Additive, repeatable migration structure intended for a disposable DB.

### Defects

- Unique entitlement allows overwrite instead of rejecting a second funding payment.
- No DB-level claim/reservation preventing two open or successful funding payments for the same member/cycle.
- Legacy `cycle_payment_status` lacks the unique key the code assumes.
- `payment_audit_events.actor_id` lacks a FK.
- `payment_notifications` lacks provider-scoped event uniqueness.
- No `CHECK` constraints for positive amounts (MariaDB compatibility may require application enforcement anyway).
- Refund/provider external operations occur inside DB transaction boundaries.

## Business-rule protection review

**PASS for current diff, but architectural projection is unsafe.**

No fee, penalty, exemption, grace-period or cycle-date rule was modified. The 40,000 first/current amount and 30,000 renewal amounts come from `lib/enhancedMembershipCycles.ts`, not payment-test constants. However, the new membership projection's hardcoded `personal` type and synthetic membership number could violate business correctness if used in real activation.

## Regression and quality evidence

| Check | Actual result |
|---|---|
| `npm test` | PASS — 6 pass, 3 gated skips, 0 fail |
| Focused disposable payment tests | PASS — 3/3 |
| Independent defect reproduction | FAIL — same-cycle double settlement and refund bypass reproduced |
| Focused ESLint on payment files/tests | PASS |
| Focused TypeScript on payment files/tests | PASS |
| Repository TypeScript | FAIL — 340 lines; remaining pre-existing errors. Phase 1A `.ts` import errors resolved by `allowImportingTsExtensions` |
| Repository ESLint | FAIL — 673 problems: 451 errors, 222 warnings; broad pre-existing debt |
| Production build | PASS — but Next.js skips type validation |
| `git diff --check` | PASS |

Passing tests do not establish acceptance because the tests did not cover same-cycle competing intents, provider mismatch, or generic refund transition.

## Documentation accuracy

The reports accurately describe much of the implemented behavior and test output, but the prior acceptance conclusion was too strong. The documents did not adequately classify the unresolved risks now identified:

- duplicate funding of the same cycle;
- generic refund transition bypass;
- provider-code mismatch;
- unauthenticated `memberId` service input;
- optional provider transaction identity;
- provider/local refund divergence;
- non-authoritative membership projection;
- legacy schema assumptions.

This review supersedes the earlier acceptance assessment.

## Required corrections before acceptance

1. Prevent competing payment intents for the same member/cycle or reject the second during settlement.
2. Lock/recheck paid-cycle/entitlement state inside settlement.
3. Change entitlement handling so a second funding payment cannot overwrite the first without an explicit reversal/reconciliation flow.
4. Remove `SUCCESS -> REFUNDED` from generic transitions.
5. Derive settlement provider from the locked payment, not caller input.
6. Require authenticated, approved member context for initiation.
7. Require transaction identity or an approved unique settlement key.
8. Move provider refund calls outside the local DB transaction with a pending-refund/reconciliation protocol.
9. Fix membership projection to preserve membership type and use the authoritative membership-number generator.
10. Add unique/claim constraints for cycle payment status or stop relying on non-existent legacy uniqueness.
11. Expand tests for duplicate funding intents, provider mismatch, generic refund transition, unapproved member, missing transaction ID, and post-provider local rollback recovery.

## Final acceptance classification

**REJECTED**

Phase 1A should not be considered complete or ready for sandbox integration until the critical/high findings are corrected and retested. Live payments remain correctly disabled, and `next_auth` remains untouched.

## Phase 1B remediation matrix

The matrix below documents remediation performed after this review. It does not modify or erase the original Phase 1A rejection above.

| Original finding | Root cause | Implemented correction | Relevant files | Database changes | Test evidence | Remaining limitation | Status |
|---|---|---|---|---|---|---|---|
| CRITICAL: duplicate payments could fund one cycle | Eligibility was checked at quote time; settlement could overwrite the entitlement allocation | Added durable member-cycle reservations, settlement reservation ownership checks, active entitlement recheck, reconciliation audit, and `SETTLED` terminal handling | `service.ts`, migration `003` | `payment_cycle_reservations` with unique `(user_id,cycle_year)` | Separate-process competing intents: one succeeds, one fails; winning settlement succeeds; replaced reservation cannot settle | Legacy externally paid records require migration reconciliation before production | PASS |
| CRITICAL: generic `SUCCESS -> REFUNDED` bypassed refund controls | `REFUNDED` was included in the generic transition map | Removed all generic transitions to `REFUNDED`; only refund completion may mark payment refunded | `service.ts` | None | Admin `transitionPayment(...,'REFUNDED')` rejected; refund completes only through request workflow | Generic transitions are still exported for internal lifecycle use | PASS |
| HIGH: settlement accepted caller-selected provider | `settlePayment` trusted `providerCode` argument | Provider code now comes from locked `payment_transactions.provider_code`; notifications also bind provider code | `service.ts` | `payment_notifications.provider_code` | Wrong-provider notification rejected; settlement no longer accepts provider argument | Provider-specific callback authentication remains blocked pending provider docs | PASS |
| HIGH: initiation trusted arbitrary member ID | Service accepted `memberId` without authenticated identity | Added `actingUserId`, impersonation rejection, user row lock, and `is_approved` check | `service.ts`, tests | None | Member impersonation and unapproved-member initiation rejected | Admin-assisted payment workflows are not implemented | PASS |
| HIGH: provider transaction identity optional | `providerTransactionId` was optional | Settlement rejects missing transaction ID; unique provider transaction constraint enforced | `service.ts`, migration `002/003` | Existing `(provider_code,provider_transaction_id)` uniqueness | Missing and duplicate transaction IDs rejected | A provider that has no transaction ID needs documented alternate settlement key | PASS |
| HIGH: provider refund could diverge on rollback | Provider calls happened inside DB transaction | Added durable refund outbox: `REQUESTED -> PENDING_PROVIDER -> PROVIDER_CONFIRMED -> COMPLETED` | `service.ts`, migration `003` | `payment_refund_requests`, allocation `REFUNDING` | Provider-confirmed/local-failure recovery completes locally without second external refund | Ambiguous initiation failure without provider reference remains manual reconciliation | PASS |
| HIGH: member/cycle eligibility not locked | Quote check used a separate connection and no durable cycle claim | Initiation now locks user and reservation, creates claim in same transaction, and rechecks active entitlement/paid state | `service.ts`, migration `003` | Reservation table | Competing intents rejected; funded-cycle recheck added | Legacy direct writes outside service still require data reconciliation | PASS |
| MEDIUM: membership projection hardcoded personal | Projection created synthetic type/member number | New membership uses stored/derived membership type and `membership_sequence` transactionally | `service.ts` | None | Covered by service tests; no fee/rule change | Projection still needs review against production-like membership variants | PASS |
| MEDIUM: refund could erase unrelated cycle status | Refund reversal ignored funding reference | Refund reversal now clears `cycle_payment_status` only when `payment_reference` matches the refunded payment | `service.ts` | None | Allocation-specific reversal verified while other cycles stay active | Legacy duplicate rows still need schema/data reconciliation | PASS |
| MEDIUM: generic transitions lacked boundaries | Actor string was arbitrary and financial transitions were exposed | `SUCCESS` and `REFUNDED` removed; financial changes are limited to settlement/refund paths | `service.ts` | None | Direct success/refund transitions rejected | Broader lifecycle actor authorization remains a future API concern | PARTIAL |
| MEDIUM: notification uniqueness scoped to payment only | Event dedup used `(payment_id,event_id)` and event ID was optional | Added provider code and provider-scoped event uniqueness; missing event IDs rejected | `service.ts`, migration `003` | `provider_code`, provider/event unique index | Missing event rejected; duplicate same-event workers create one row | Provider-specific event identity rules remain blocked | PASS |
| MEDIUM: notification persistence eventual | Notification row inserted after settlement | Service now requires event ID and preserves settlement idempotency; retry still safe | `service.ts` | Notification schema | Crash-after-settlement retry produces duplicate without second entitlement | Event receipt history may still require an append-only inbox if required by provider | PARTIAL |
| MEDIUM: manual evidence hash only | Evidence source was not stored | Evidence requirement remains enforced and hash persisted | `service.ts` | `evidence_hash` already present | Missing evidence rejected; successful manual refund stores hash | Secure evidence-storage location remains undecided | PARTIAL |
| MEDIUM: audit only stored hash | No structured event details | Added `event_data` JSON while retaining event hash | `service.ts`, migration `003` | `event_data` column | Refund/settlement tests write audit rows | External immutable audit sink absent | PASS |
| MEDIUM: `ON DUPLICATE` assumed missing legacy unique key | Legacy `cycle_payment_status` lacked `(user_id,cycle_year)` uniqueness | Code now selects and locks existing status row before update/insert | `service.ts` | No unsafe legacy constraint added | Disposable tests pass; duplicate payment prevented by canonical layers | Legacy unique constraint still missing | PARTIAL |
| MEDIUM: organization projection could be wrong | Allocation did not carry type | Projection checks `membership_type`/`user_category` | `service.ts` | `user_category` from migration `001` | Implemented and type-checked | Needs organization fixture verification before sandbox | PARTIAL |
| LOW: gateway registry mutable | Any code could replace adapter | Registry now rejects duplicate provider registration; test gateway requires disposable flag and non-production env | `gateways.ts` | None | Duplicate/test-gateway restrictions exercised | Secure runtime config management remains an operational control | PASS |
| LOW: provider event ID optional | Notification could settle without event trace | Required event ID | `service.ts`, tests | Provider/event uniqueness | Missing event ID rejected | If real provider omits event IDs, alternate dedup must be documented | PASS |
| LOW: nullable unique columns | Null provider fields allowed | Required provider reference/transaction identity at settlement and refund reference before completion | `service.ts`, migrations | Existing unique keys | Missing transaction ID rejected; refund request requires provider reference before completion | Provider-specific null semantics remain blocked | PASS |
