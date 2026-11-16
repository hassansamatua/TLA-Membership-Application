# Phase 0 Security Remediation Report

Date: 2026-11-02  
Repository: `TLA-Membership-Application` local workspace  
Scope: emergency containment only. This is not a production-readiness certification.

## 1. Executive summary

The audit findings were materially reproducible in the current code: password-reset codes were returned in responses and logged, public fallback JWT secrets existed, API authorization was route-dependent, reports were not centrally protected, dangerous maintenance routes were present, and payment completion could be activated without independent gateway confirmation.

Phase 0 changes now provide:

- Generic password-reset responses and HMAC-only reset-token storage.
- 15-minute expiry, one-time consumption, and bounded verification/request attempts.
- Central API authorization through `middleware.ts` and `lib/api-security.ts`.
- Server-verified admin authorization for admin, report, export, and financial endpoints.
- Fail-closed `503` for destructive imports/migrations/debug endpoints and unsafe payment completion paths.
- Fail-closed JWT signing/verification when required secrets are absent, weak, or known-public.
- Production `Secure` cookie behavior for the login session.
- Removal of hardcoded AzamPay credentials and test-mode automatic success.
- Central unavailability of `/api/payments/azampay/callback`, plus a handler-level `503` before any side effects.
- Member-only ownership checks for message read/reply/delete operations.
- Reduced disclosure of SQL details and sensitive values in modified paths.

Payment flows are intentionally unavailable until official AzamPay verification details and sandbox credentials are available. This is a containment tradeoff, not a completed payment implementation.

## 2. Audit finding validation

| Finding | Current-code result | Evidence |
|---|---|---|
| Reset code exposed | Confirmed | Original `forgot-password` response returned `resetCode` and `expiryTime`; verify route logged the code and token. |
| Unauthenticated admin creation | Confirmed | `/api/setup/ensure-admin` had unauthenticated POST and inserted admin users. |
| Unauthenticated cleanup/migration/import | Confirmed | Multiple `migrate-*`, `import-*`, `fix-*`, `verify-migration`, and `payments/cleanup` routes existed without central authorization. |
| Unverified payment completion | Confirmed | `/api/membership/pay`, `/api/membership/payment-success`, `/api/payments/process`, and AzamPay test paths could mark membership/payment effects complete. |
| Missing admin authorization | Confirmed | `middleware.ts` skipped `/api/*`; several handlers had no or token-claim-only role checks. |
| Reports exposed | Confirmed | `/api/reports/generate` had no handler auth and could produce member/financial data. |
| Public JWT fallback | Confirmed | `lib/auth.ts` used `your-secret-key`; refresh used public development fallbacks. |
| Callback verification bypass | Confirmed | callback verification only ran in production and sandbox verification returned true. |
| Debug/test endpoints | Confirmed | `/api/debug/*`, `/api/test-*`, `/fix-auth`, `/test-membership-card` were present. |
| Sensitive info in Git | Confirmed | tracked uploads, SQL/archive files, diagnostic files, and one untracked upload were identified. |

## 3. Implemented changes by file

### Authentication/authorization

| File | Issue addressed | Change | Functional impact | Evidence |
|---|---|---|---|---|
| `middleware.ts` | `/api/*` bypassed authorization | Routes all APIs through `authorizeApi()`; strips client-supplied `x-user-id`/`x-user-role`; `no-store`; returns `404` for dev pages | API requests now run server-side policy before handlers | Anonymous protected APIs returned `401`; member admin APIs returned `403`; dangerous APIs returned `503`; build passed |
| `lib/api-access.ts` | No central route inventory | Added route classification policy | Dangerous operations fail closed while public/member routes retain intended access | `apiAccess()` regression tests pass |
| `lib/api-security.ts` | No reusable auth/admin boundary | Added token parsing, `requireUser()`, `requireAdmin()`, database-backed role lookup, internal-secret check, same-origin mutation check | Adds DB lookup for each protected request; safer than trusting headers or claims | anonymous `401`; synthetic member `403` on admin; synthetic admin `200` where schema permitted |
| `lib/auth.ts` | Public fallback secret and secret logging | Removed fallback; requires 32-byte secret; restricted JWT algorithm; validates token claims; removed password/hash logging | Existing sessions signed by old secret are invalid; missing secret fails authentication | unit tests reject absent/short/public secret and invalid/expired/wrong-secret JWTs |
| `app/api/auth/login/route.ts` | Insecure production cookie / token log | `secure` now follows production; token log redacted | Local HTTP still works; HTTPS production required | synthetic member login returned `200`; cookie flag configured correctly by code |
| `app/api/auth/refresh/route.ts` | Public refresh fallback and stale claims | Requires 32-byte refresh secret; validates `exp`/`iat`; reloads user/approval from DB; reuses primary access-token signer | Missing refresh secret returns `503`; refresh requires current approved DB user | code and auth tests; no fallback remains |

### Password reset

| File | Issue addressed | Change | Functional impact | Evidence |
|---|---|---|---|---|
| `lib/password-reset.ts` | Token exposure/plaintext storage/unbounded attempts | New shared workflow: generic response; CSPRNG six-digit code; HMAC digest + attempt count; constant-time compare; expiry; atomic consume; bcrypt password hashing | Only the latest valid code can be used; email delivery failure still returns generic response | request response had no token; DB stored `64-hex:counter`; verify/reset/reuse/expired/invalid paths tested |
| `app/api/auth/forgot-password/route.ts` | Code returned and plaintext stored | Delegates to shared secure workflow | Response is always generic; unknown and known emails equivalent | known and unknown POST returned same body/status |
| `app/api/auth/forgot-password/verify/route.ts` | Code and token logged; user info returned | Delegates to non-consuming verifier | Verification no longer exposes user details | valid code `200`; invalid/expired `400` |
| `lib/email-simple.ts` | Reset code and recipient logged; TLS disabled; hardcoded sender fallback | TLS verification enabled; sender fallback removed; secret/log content removed | Email send requires configured SMTP sender/credentials | reset request safely returned generic response even though delivery failed |
| `lib/email-config.ts` | Same email logging/default sender issue | Removed code logging and hardcoded sender | Alternate email implementation fails without sender config | source review/test assertions |

### Data ownership and sensitive data

| File | Issue addressed | Change | Functional impact | Evidence |
|---|---|---|---|---|
| `app/api/messages/route.ts` | Broken parameter binding could expose/fail query | Added second `userId` parameter | Correct own-message query | member request reached handler; local schema lacks `messages`, so full result blocked |
| `app/api/messages/[id]/route.ts` | Any member could delete any message ID | Delete constrained to sender or receiver | Other users cannot delete the record | ownership predicate added |
| `app/api/messages/[id]/read/route.ts` | Any member could mark another user's message read | Update constrained to receiver | Other users cannot alter read state | ownership predicate added |
| `app/api/messages/reply/route.ts` | Unrestricted read-marker and message lookup | Constrained marker to receiver and lookup to sender/receiver | Nonparticipants cannot read/reply via ID | ownership predicates added |
| `app/api/reports/generate/route.ts` | Public report and SQL/data logging | Central admin classification plus removal of data/query logging and SQL error details | Members/anon blocked; admin report remains | anonymous `401`, member `403`, admin `200/400 depending params` |
| `app/api/reports/send-email/route.ts` | Public report email path / missing credential handling | Admin classification; internal report fetch forwards caller auth/cookie; absent Resend key returns `503` | Authorized admin only; missing email config fails safely | anonymous `401`, member `403`, admin `503` without mail key |
| `app/api/send-approval-email/route.ts` | Missing Resend key could throw | `503` when email provider unconfigured; admin classified | Notification unavailable without config | anonymous `401`, member `403`, admin `503` |
| `app/api/payments/check-payment/route.ts` | Payment row/error detail disclosure | Removed payment/ID logging and internal details | Own-payment lookup retained | anonymous `401`, member `404` for absent payment |
| `app/api/membership/status/route.ts` | Internal SQL details in error response | Generic 500 body | Same availability; no SQL message in response | schema mismatch produces generic response only |

### Payment containment

| File | Issue addressed | Change | Functional impact | Evidence |
|---|---|---|---|---|
| `lib/api-access.ts` | Client-declared payment activation | Marks all unsafe payment mutation/checkout/callback/test routes unavailable | Payments cannot complete during Phase 0 | anonymous/member/admin unsafe payment routes returned `503` |
| `app/api/payments/azampay/callback/route.ts` | Callback side effects before reliable verification | Handler returns `503` before parsing/mutating | Duplicate/invalid callbacks cannot affect DB | two callback POSTs returned `503`; payment count stayed `0` |
| `lib/azampay.ts` | Hardcoded credentials/test success/true signature | Credentials moved to env; missing config fails; test status cannot report success; signature verification returns false until official spec/config exists | Gateway library cannot silently fabricate success | source review and API `503` tests |

### Development/admin/destructive endpoints

- Central `503` now applies to `/api/setup/ensure-admin`, unsafe admin creation/repair/reset, import and migration routes, membership repair, payment cleanup, debug/test routes, and unsafe payment completion routes.
- `/fix-auth` and `/test-membership-card` return `404` in middleware.
- Verified live statuses: `401` for protected routes, `403` for member admin access, `503` for disabled operations, `404` for dev pages.

## 4. Local integration verification

Test environment:

- Local Next.js production server on `localhost:3101`.
- Dedicated disposable DB `phase0_test` with copied schema and two synthetic identities only.
- Test JWT secrets supplied to process only; no production secrets or real member accounts used.
- SMTP and payment gateway credentials intentionally absent.

### Password reset evidence

| Test | Result |
|---|---|
| POST reset request, registered synthetic account | `200`, generic response; no token field |
| POST reset request, unknown account | `200`, identical generic response |
| Stored reset representation | `64-hex digest:counter`; not a six-digit plaintext code |
| Correct test code via `/verify` | `200` |
| Correct test code via `PUT` reset | `200` |
| Reused same code | `400` |
| Old password login | `401` |
| New password login | `200` |
| Expired code verify/reset | `400` / `400` |
| Invalid code reset | `400`; original password remained valid |
| Token/password logging | Server output showed no reset code or submitted password; auth logs still include non-secret user metadata |

### Authorization evidence

| Route/action | Anonymous | Member | Admin | Result |
|---|---:|---:|---:|---|
| `/api/auth/me` GET | 401 | 200 | 200 | PASS |
| `/api/auth/profile` GET | 401 | 200 | 200 | PASS |
| `/api/events` GET | 401 | 200 | 200 | PASS |
| `/api/admin/users` GET | 401 | 403 | 200 | PASS |
| `/api/admin/reports/summary` GET | 401 | 403 | 200 | PASS |
| `/api/reports` GET | 401 | 403 | 200 | PASS |
| `/api/admin/payments/list/export` GET | 401 | 403 | 200 | PASS |
| `/api/payments` GET | 401 | 403 | 200 | PASS |
| `/api/admin/approve-member` POST | 401 | 403 | 200 | PASS — member cannot self-approve |
| `/api/admin/users/1/approve` POST | 401 | 403 | 200 | PASS |
| `/api/admin/users/1/password` POST | 401 | 403 | 400 | PASS — admin reached handler but rejected invalid body |
| `/api/reports/send-email` POST | 401 | 403 | 503 | PASS — provider not configured |
| `/api/cron/membership-reminders` | 403 | 403 | 403 | PASS — no `CRON_SECRET` supplied |
| `/api/messages` GET | 401 | 500 | 500 | PARTIAL — schema lacks `messages`; authorization boundary still works |
| `/api/membership/status` GET | 401 | 500 | 500 | PARTIAL — schema lacks `user_category`; authorization boundary works |
| `/api/events` POST | N/A | 403 policy | admin | PASS by policy test |

### Payment evidence

| Route/action | Anonymous | Member | Admin | Result |
|---|---:|---:|---:|---|
| `/api/membership/pay` POST | 503 | 503 | 503 | PASS — unavailable |
| `/api/membership/payment-success` POST | 503 | 503 | 503 | PASS |
| `/api/membership/complete-payment` POST | 503 | 503 | 503 | PASS |
| `/api/payments/complete` POST | 503 | 503 | 503 | PASS |
| `/api/payments/process` POST | 503 | 503 | 503 | PASS |
| `/api/payments/azampay/callback` POST | 503 | 503 | 503 | PASS — invalid/unverified rejected |
| Duplicate callback attempts ×2 | 503 + 503 | N/A | N/A | PASS — zero new payment rows |

### Development endpoint evidence

`/api/test-db`, `/api/debug/current-user`, `/api/migrate-data`, `/api/import-db`, `/api/setup/ensure-admin`, `/api/payments/cleanup`: `503` for all tested identities. `/fix-auth`, `/test-membership-card`: `404`.

## 5. Commands and actual results

| Command | Result |
|---|---|
| `npm test` | PASS — 6 tests, 0 failures |
| `npm run build` | PASS — compiled and generated all routes; type validation skipped by existing Next config |
| `npx tsc --noEmit --pretty false` | FAIL — 340 output lines; broad pre-existing route signature and `lib/db-utils.ts` errors remain |
| `npm run lint` | FAIL — 673 problems: 451 errors, 222 warnings; consistent with prior broad quality findings |
| `git diff --check` | PASS |
| Local HTTP auth matrix | PASS/PARTIAL as detailed above |
| Reset workflow integration | PASS for token handling; email delivery not verified because SMTP was absent |
| Payment duplicate callback test | PASS — 503 and no payment side effects |

## 6. Requirement status

| Requirement | Status |
|---|---|
| Reset token never exposed | PASS |
| Generic unknown/registered response | PASS |
| Secure token storage | PASS — HMAC digest + counter |
| Token expiration | PASS |
| One-time use | PASS |
| Invalid/expired cannot reset | PASS |
| Reset/password logs absent | PASS for modified reset flow |
| Anonymous protected API blocked | PASS |
| Member admin operations blocked | PASS |
| Member self-approval blocked | PASS |
| Destructive/admin maintenance protected | PASS — disabled centrally |
| Reports protected | PASS |
| No public JWT fallback | PASS |
| Missing secrets fail safely | PASS |
| Unverified payment cannot activate | PASS — payment mutations disabled |
| Callback cannot bypass verification | PASS — always unavailable/fail closed |
| Duplicate callback effects prevented | PASS — no effects possible |
| Dev endpoints unavailable in production | PASS — actually unavailable in all environments |
| Members cannot access other members' data | PARTIAL — ownership fixed where identified; incomplete schema prevented broad end-to-end checks |
| All route handlers individually hardened | PARTIAL — central boundary applied, but route-level legacy code still contains inconsistent checks |
| Payment integrity | BLOCKED — official gateway spec/credentials required |
| Email delivery | PARTIAL — delivery code preserved but no SMTP credentials/test delivery |
| TypeScript quality | FAIL — pre-existing failures remain |
| ESLint quality | FAIL — 673 findings remain |

## 7. Sensitive Git material

See `PHASE_0_REMAINING_RISKS.md` for the path-level inventory. The repository tracks member uploads/documents, SQL/archive files, PHP config/diagnostic files, and probe outputs. History rewrite or bulk removal was not performed and requires authorization plus private review.

## 8. Production deployment implications

- Set `JWT_SECRET`, `JWT_REFRESH_SECRET` (if refresh enabled), `NEXTAUTH_SECRET`, `CRON_SECRET`, email variables, and non-production database variables before starting the app.
- Existing sessions signed under the old public fallback will be invalidated. Require reauthentication.
- Any previously issued plaintext reset codes become unusable; communicate that users must request a new code.
- Payment/membership activation is currently unavailable by design. Do not deploy expecting revenue collection.
- Keep development endpoints unavailable; do not route around middleware.
- Audit uploaded files and legacy PHP/SQL assets before deployment or public exposure.
- Fix `next.config.js` type-check bypass before relying on builds as a quality gate.

## 9. Phase 1 readiness

Phase 1 payment-integrity work can proceed only after the team supplies official AzamPay callback authentication documentation, sandbox credentials, and a reviewed schema baseline. The current code is safer because untrusted payment completion is blocked, but it is not functionally payment-ready.
