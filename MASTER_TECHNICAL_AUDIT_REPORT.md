# Master Technical Audit Report — TLA Membership Management Application

Date: 2026-11-02 · Evidence base: source tracing, disposable MySQL 8 rebuilt from `lib/next_auth(4).sql`, `next dev` runtime probes, `tsc`/`eslint`/`next build`/`npm audit`, and `tsx` boundary tests. Detailed evidence in the companion documents in this folder.

## 1. What the system does
A Next.js 16 monolith (UI + 121 JSON API routes) over MySQL with raw SQL and custom JWT cookies. It supports member registration → admin approval → member dashboard, profile, membership card PDFs, annual-cycle fee/penalty calculation, AzamPay mobile-money checkout, admin user/event/news/CMS management and reports. A large number of one-off migration/fix/debug/test endpoints are deployed in the same app.

## 2. Production readiness: **Not ready**
## 3. Top findings (severity-ordered)
| # | Sev | Finding | Evidence |
|---|---|---|---|
| 1 | Critical | Password-reset endpoint returns the reset code → account takeover of any user incl. admins | `app/api/auth/forgot-password/route.ts` POST |
| 2 | Critical | Unauthenticated admin creation / destructive / migration endpoints (`setup/ensure-admin`, `payments/cleanup`, `payments/complete`, `import-*`, `migrate-*`, `fix-membership`) | SECURITY S2–S5; runtime reachability |
| 3 | Critical | Payments can be marked completed without gateway confirmation (`membership/pay`, `payment-success`, `complete-payment`, `payments/complete`) | S4, S9, S10 |
| 4 | High | Unauthenticated PII/financial reports & export | runtime 200 on `/api/reports/generate`, `/api/admin/reports/*` |
| 5 | High | Missing admin-role checks on `/api/admin/payment(s)`, `/api/admin/news`; member can approve self via payment POST | runtime IDOR (S8) |
| 6 | High | Shipped schema: 0 FKs, 29/36 tables without PK/AUTO_INCREMENT → payment inserts fail (runtime 500); heavy orphan data; invalid enum values | DATABASE D1–D5 |
| 7 | High | Four contradictory fee/penalty engines; legacy penalty off by one month; 10% penalty in pay route; first-cycle exemption never ends for non-payers; Jan excluded from early-payment window; EAT date off-by-one | BUSINESS_LOGIC BL1–BL8 |
| 8 | High | Weak crypto/secrets: public JWT secret fallback, unsalted MD5/SHA accepted, SHA-256 on reset, password fragments logged | S13, S15, S21 |
| 9 | Medium | Personal data in git: uploads, full DB dumps with users/NIDA/hashes, `users_backup` | S19 |
| 10 | Medium | Quality: 147 TS errors hidden by `ignoreBuildErrors`, 454 ESLint errors, no tests, lockfile out of sync, 68 prod dependency vulns, no CI/README/.env.example | TESTING report |

## 4. Complete vs incomplete (summary — see FEATURE_MATRIX)
- Verified working: registration, login, page-level auth redirects, admin user API role guard, cron secret gate, cycle date math (engine level, leap years).
- Implemented but untested: approval, AzamPay, email notifications, events, CMS, messaging, cards, reports UI.
- Partial/inconsistent: fees, penalties, exemption, multi-cycle, membership numbers, profiles/categories.
- Broken: self-pay & admin manual payment (on shipped schema), refunds, advance payment, token refresh, `test-db`, PHP API.
- Not found: suspension/termination, RBAC beyond admin, partial-payment balances, audit logging, attendance, SMS, automated tests.

## 5. Top ten recommendations
1. Immediately disable/remove from deployment all `import-*`, `migrate-*`, `fix-*`, `setup/*`, `debug/*`, `test-*`, `payments/cleanup`, `payments/complete`, `create/fix/reset-admin` routes and dev pages.
2. Fix password reset (never return code, hash token, rate-limit, bcrypt for new password) and rotate all passwords if the reset route has been live.
3. Introduce a default-deny API guard (`requireUser`/`requireAdmin`) and apply to every route; fix reports and admin payment/news routes.
4. Make the verified AzamPay callback/status check the **only** path that completes a payment; compute amounts server-side; idempotency on reference; always verify signatures.
5. Get a production schema dump; repair PK/AUTO_INCREMENT, add UNIQUE + FKs after orphan review, via a real migration tool.
6. TLA decides the authoritative fee/penalty/exemption/advance-window rules; consolidate into one server module with unit tests covering the boundary table.
7. Remove secret fallbacks, legacy hash acceptance (rehash on login), sensitive logging; set `secure` cookies; generic login errors; rate limiting.
8. Purge PII (uploads, dumps, backup tables) from the repository and its history; move uploads to object storage.
9. Remove `ignoreBuildErrors`, fix TS/ESLint errors, sync lockfile, move `vercel` to devDependencies, add CI.
10. Add a test suite (business rules, auth guards, payment flow with gateway mocks), audit logging for approvals/payments, `.env.example` and README.

## 6. Verified vs unknown
Verified: everything marked runtime/source/test in companion docs. Unknown: actual production schema & data, hosting setup, AzamPay sandbox behaviour, SMTP delivery, file-upload validation, visual/accessibility quality, whether any of the dangerous routes are reachable in the current deployment.

## 7. Documents
`PROJECT_OVERVIEW.md`, `REPOSITORY_STRUCTURE.md`, `SYSTEM_ARCHITECTURE.md`, `DATABASE_AUDIT.md`, `MODULE_ANALYSIS.md`, `BUSINESS_LOGIC_AUDIT.md`, `API_DOCUMENTATION.md`, `SECURITY_AUDIT.md`, `UI_UX_AUDIT.md`, `TESTING_AND_QUALITY_REPORT.md`, `DEPLOYMENT_READINESS.md`, `FEATURE_MATRIX.md`, `IMPROVEMENT_ROADMAP.md`, working notes `_PROGRESS.md`.
