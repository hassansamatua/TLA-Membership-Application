# Phase 1 Payment Security Test Plan

Date: 2026-11-02  
Scope: sandbox/simulated tests only. No real transactions or production credentials.

## Environments

- Disposable `phase0_test`/new Phase 1 test database only.
- Local Next.js server with test-only `JWT_SECRET`, `JWT_REFRESH_SECRET`, database, and sandbox variables.
- Mocked AzamPay client responses until official sandbox procedures are confirmed.

## Test matrix

| Scenario | Test | Expected |
|---|---|---|
| Successful payment | Initiate, simulated authenticated callback, authoritative success response | one `SUCCESS` payment; paid cycles/membership activated once |
| Failed payment | verified gateway failure | `FAILED`; no activation |
| Pending payment | gateway still pending | remains `PROCESSING`/pending; no activation |
| Cancelled payment | verified cancellation | `CANCELLED`; no activation |
| Expired checkout | verified expiry or timeout policy | `EXPIRED`; no activation |
| Invalid callback signature | malformed signature/secret | reject before DB mutation; audit rejection |
| Missing signature | callback omits required auth | reject unless docs explicitly support unsigned callbacks and business approves |
| Duplicate callback | same event sent twice/concurrently | one completion effect; second is no-op |
| Incorrect amount | gateway amount differs from stored expected amount | reject; no activation; audit |
| Incorrect currency | non-`TZS` or mismatched currency | reject; no activation |
| Unknown reference | callback for nonexistent reference | reject; no activation |
| Cross-member reference | callback maps to another user | reject; no activation |
| Client-declared success | POST success/completion endpoint directly | `503`/reject; no activation |
| Client-provided amount | modified request amount | server-calculated amount used |
| Duplicate initiation | member submits twice | one open payment or deterministic reuse per approved semantics |
| Concurrent notifications | parallel callbacks/status requests | only one settlement transition |
| Gateway timeout | status call times out | remains verification-required; no activation |
| Gateway verification unavailable | 5xx/network error | fail closed; retryable state |
| Refund | verified refund event/admin operation | `REFUNDED`; approved membership effect only |
| Status check authorization | member queries status | only own payment summary returned |
| Admin reports | member requests export | `403` |

## Database assertions

- `payments.reference` unique.
- `transaction_id` unique where non-null.
- No duplicate `membership_payments` for same payment/cycle.
- No duplicate `cycle_payment_status` paid records.
- Membership expiry reflects exactly the intended paid cycle(s).
- Failed/pending/cancelled records do not alter membership.
- Audit events record actor/source and correlation ID without secrets.

## Implementation test levels

1. Unit tests for state transitions and validation.
2. Route tests for auth/role and response statuses.
3. Mocked gateway tests for callback and status responses.
4. Concurrent request tests.
5. DB constraint/transaction tests on disposable schema.
6. Sandbox smoke tests only after official docs and credentials are approved.
7. Regression tests preserving Phase 0 containment.

## Current blockers

- Official callback signature/authentication procedure.
- Official status endpoint identifier and response semantics.
- Sandbox credentials and test phone/provider behavior.
- Whether multiple cycles can settle as one transaction.
- Refund business rule.
