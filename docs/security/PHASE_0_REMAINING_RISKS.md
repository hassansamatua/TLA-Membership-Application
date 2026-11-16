# Phase 0 Remaining Risks and Blockers

Date: 2026-11-02

## Critical blocker: payments

- **Status:** payment completion is intentionally disabled/fails closed.
- **Reason:** the repository contained hardcoded gateway material, unconditional test success behavior, and callback signature acceptance in sandbox/non-production paths.
- **Required information:** official AzamPay callback contract, signature/public-key mechanism, sandbox credentials, transaction-status endpoint semantics, and expected idempotency key/reference behavior.
- **Current behavior:** `/api/membership/pay`, `pay-early`, `payment-success`, `complete-payment`, `/api/payments/complete`, `mobile-money`, `process` POST, AzamPay checkout/callback, PesaPal, and test payment endpoints return `503` centrally. The callback handler itself also returns `503` before side effects.
- **Verification:** anonymous, member, and admin requests returned `503`; two duplicate callback attempts produced zero new `payments` rows in `phase0_test`.

## Database schema mismatch

- `users.user_category` is required by current code but absent in `next_auth` and `phase0_test`.
- `messages` is expected by `app/api/messages/**` but absent in both schemas.
- Required migrations were documented in `DATABASE_SCHEMA_COMPATIBILITY.md`; none were applied.
- Member dashboard and message APIs remain partially blocked until the approved local/staging migrations are applied.

## Authorization completeness

Central policy protects known sensitive route families, but this codebase has inconsistent per-route validation and dynamic handlers. A complete end-to-end authorization test over every one of the 121 route files was not possible against the incomplete disposable schema. The route inventory is centralized in `API_AUTHORIZATION_MATRIX.md` and should be re-run after migrations.

## Authentication concerns not fully resolved

- The legacy `comparePasswords()` function still accepts several legacy hash formats for compatibility. It should be replaced by a migration to a single modern password hash after inventorying existing credentials.
- `app/api/auth/[...nextauth]` includes a separate credentials flow whose `authorize()` implementation compares plaintext passwords. It is permitted as a public auth route but remains a high-risk legacy path and should be reconciled with the primary auth implementation.
- JWT payload role data is checked, then refreshed against the database by `requireUser()`. Some individual handlers still trust JWT claims directly; centralized middleware now supplies the server-side boundary.
- The auth cookie is set correctly for production, but end-to-end HTTPS cookie behavior was not verified because only local HTTP was used.

## Password reset limitations

- The workflow was verified using a synthetic account and a test-generated HMAC token record because SMTP credentials were intentionally absent.
- Email delivery itself was **not** verified; the send function failed safely without logging the code.
- Rate limiting is in-memory and resets on process restart. It is suitable for a single local process but should be replaced or supplemented by durable/shared rate limiting before multi-instance deployment.
- Existing plaintext reset codes already stored in databases will not validate. A deployment cleanup/expiration approach is required after confirming active reset windows.

## Sensitive tracked files

The following tracked content categories require repository-owner review. No contents were reproduced.

| Path / pattern | Tracked? | Likely sensitive material | Recommended remediation |
|---|---:|---|---|
| `public/uploads/documents/*.pdf` | Yes | Uploaded member documents | Remove from public deployment; migrate to private storage; assess whether member identifiers/personal documents are present; rotate any embedded credentials if found. |
| `public/uploads/profile-pictures/*` | Yes | Member images / personal data | Remove from repository; store privately or behind authorization; scrub history after approval. |
| `_archive/*.sql`, `database/*.sql`, `lib/next_auth(4).sql` | Yes | Schema/user-related SQL and potential dumps | Audit privately; remove unnecessary dumps; rotate exposed credentials or tokens if found; do not publish. |
| `_archive/*.php`, `api/**/*.php`, `config.php`, `Database.php`, `jwt.php` | Yes | Legacy diagnostics/config and possible credentials | Audit privately; remove unused PHP service/config files from deployment; rotate any exposed DB/JWT/email/gateway secrets. |
| `public/uploads/profile-pictures/0eadaf9d-0a09-4a29-9d07-a41f58830d8f.jpeg` | No (untracked at review time) | Member upload | Exclude and move to private storage before committing. |
| `_probe*.out`, `database/_probe*.sql` | Mixed/tracked outputs | Diagnostic output | Review privately; remove from repo/deployment if not needed. |

History rewriting, bulk file deletion, and force-push were not performed and require explicit authorization.

## Quality gate status

- `npm test`: **PASS** (6 tests).
- `npm run build`: **PASS**, but Next.js skips type validation because `next.config.js` sets `ignoreBuildErrors: true`.
- `npx tsc --noEmit`: **FAIL** (340 output lines / many pre-existing route typing errors and broken `lib/db-utils.ts`).
- `npm run lint`: **FAIL** (673 problems: 451 errors, 222 warnings), consistent with the prior audit’s broad quality findings.
- `git diff --check`: **PASS**.

## Operational risks

- In-memory reset attempt limiting does not survive restart or scale horizontally.
- Debug/logging remains verbose in several pre-existing routes and may log non-secret member metadata. Secret/token/password logging in the modified reset and JWT paths was removed, but a full codebase logging-redaction pass remains outstanding.
- The test database lacked several current-schema tables, so member workflow verification is partial.
- Payment functionality is unavailable by design until Phase 1 gateway verification.
- `next.config.js` still ignores TypeScript build errors, allowing a successful build even though `tsc` fails.
