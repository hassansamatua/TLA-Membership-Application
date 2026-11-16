# AzamPay Integration Requirements — Phase 1

Date: 2026-11-02  
Status: requirements inventory; no undocumented behavior is assumed.

## Repository evidence

`lib/azampay.ts` currently contains:

- Token request to `{authenticatorBaseUrl}/AppRegistration/GenerateToken`
- Checkout request to `{checkoutBaseUrl}/Checkout/CreateCheckout`
- Status request to `{checkoutBaseUrl}/Checkout/GetTransactionStatus?reference=...`
- Sandbox URLs:
  - `https://authenticator-sandbox.azampay.co.tz`
  - `https://sandbox.azampay.co.tz`
- Production URLs:
  - `https://authenticator.azampay.co.tz`
  - `https://api.azampay.co.tz`
- Environment credential names:
  - `AZAMPAY_CLIENT_ID`
  - `AZAMPAY_CLIENT_SECRET`
  - `AZAMPAY_APP_NAME`
  - `AZAMPAY_CALLBACK_URL`
  - `AZAMPAY_ENVIRONMENT`
  - `AZAMPAY_TEST_MODE`

These endpoint paths and URLs must be confirmed against official documentation before implementation.

## Required official documentation

| Item | Status |
|---|---|
| Official AzamPay API documentation and version | BLOCKED |
| Sandbox account/dashboard access | BLOCKED |
| Sandbox client ID, client secret, and app name | BLOCKED |
| Registered sandbox callback URL requirements | BLOCKED |
| Supported membership payment channels/providers | BLOCKED |
| Checkout request schema and required fields | BLOCKED |
| Checkout response schema and redirect semantics | BLOCKED |
| Callback payload schema and headers | BLOCKED |
| Callback authentication method | BLOCKED |
| Signature algorithm, signing input, key format, and key source | BLOCKED |
| Server-side transaction status endpoint | BLOCKED |
| Expected app/gateway/external references | BLOCKED |
| Timeout/retry and idempotency guidance | BLOCKED |
| Expiry/cancellation behavior | BLOCKED |
| Refund API and refund callback semantics | BLOCKED |
| Sandbox test accounts and simulated outcomes | BLOCKED |
| Production onboarding and callback allowlisting | BLOCKED |

## External evidence found

A web search located secondary documentation suggesting AzamPay callbacks may contain an RSA signature over selected callback fields and that a public key may be exposed by a separate endpoint. This was not treated as authoritative because it was not the official AzamPay integration specification for this implementation.

**Decision:** do not implement callback verification from secondary/inferred documentation. Obtain official documentation or AzamPay confirmation.

## Required sandbox verification matrix

Before coding is approved, confirm:

1. Token issuance request, response, expiry, and error formats.
2. Correct checkout endpoint for the intended payment product.
3. Required checkout fields and provider/channel codes.
4. Whether `reference`, `externalreference`, `orderId`, `transactionId`, or `utilityref` is the canonical reconciliation key.
5. Whether callbacks include a signature/password/client identifier and how to verify it.
6. Whether server-side status polling is required, supported, or recommended.
7. Whether status endpoint accepts app reference, gateway transaction ID, or both.
8. Whether repeated checkout initiation uses an idempotency key.
9. Expected success/failure/cancel/expiry values.
10. Currency support and exact amount units.
11. Callback retry behavior and acknowledgement requirements.
12. Sandbox test phone numbers and simulated success/failure procedures.

## Proposed configuration contract — pending confirmation

| Variable | Purpose | Status |
|---|---|---|
| `AZAMPAY_ENVIRONMENT` | Select sandbox/production | ASSUMPTION |
| `AZAMPAY_CLIENT_ID` | Gateway auth | ASSUMPTION |
| `AZAMPAY_CLIENT_SECRET` | Gateway auth | ASSUMPTION |
| `AZAMPAY_APP_NAME` | Gateway auth | ASSUMPTION |
| `AZAMPAY_CALLBACK_URL` | Registered callback target | ASSUMPTION |
| `AZAMPAY_CALLBACK_PUBLIC_KEY` | Signature verification | BLOCKED pending docs/key name |
| `AZAMPAY_CALLBACK_SECRET` | Alternative callback credential if specified | BLOCKED |
| `AZAMPAY_STATUS_BASE_URL` | Status endpoint base if different | BLOCKED |
| `AZAMPAY_CHECKOUT_BASE_URL` | Checkout endpoint base | ASSUMPTION pending docs |
| `AZAMPAY_AUTHENTICATOR_BASE_URL` | Token endpoint base | ASSUMPTION pending docs |

## Security requirements for implementation

- Store credentials only in environment/secrets management.
- Do not log tokens, signatures, secrets, phone numbers, or full callback payloads.
- Validate callback authenticity before reading business fields.
- Independently query authoritative transaction status before activation.
- Verify app reference, member, amount, currency, and gateway transaction ID.
- Process each app reference and gateway transaction ID once.
- Fail closed on verification outage, malformed data, or unknown reference.
- Do not use test mode to return `SUCCESS` or activate membership.

## Decisions

| Decision | Classification |
|---|---|
| Current code endpoint paths exist | VERIFIED |
| Current URLs/path correctness | BLOCKED pending official docs |
| Signature mechanism | BLOCKED |
| Server-side status endpoint and identifier | BLOCKED |
| Checkout field schema | BLOCKED |
| Mobile provider/channel mapping | BLOCKED |
| Safe implementation before docs | BLOCKED |
