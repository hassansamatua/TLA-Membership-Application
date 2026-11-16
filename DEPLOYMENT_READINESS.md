# Deployment Readiness

## Required environment variables (names only; from `process.env.*` usage)
- Core: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_SSL_CA`, `MYSQL_SSL_CERT`, `MYSQL_SSL_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `NODE_ENV`, `CRON_SECRET`
- Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_SECURE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `RESEND_API_KEY` (three naming schemes for the same thing)
- Payments: `AZAMPAY_*` (merchant code, client credentials per `lib/azampay.ts`), `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_NOTIFICATION_ID`, `NEXT_PUBLIC_PESAPAL_ENV`, `MPESA_PASSKEY`, `MPESA_BUSINESS_SHORTCODE`, `TIGOPESA_MERCHANT_CODE`, `AIRTEL_MERCHANT_ID`, `HALOPESA_MERCHANT_ID`
- Unused/legacy: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `TWILIO_*`
No `.env.example` is provided. Missing `JWT_SECRET` silently falls back to a public default (S13).

## Build/start
`npm install` (not `npm ci` until lockfile fixed) → `npm run build` → `npm start`. Build passes only because type errors are ignored.

## Database
MySQL 8 compatible; dump requires `log_bin_trust_function_creators` (or definer privileges) for the stored function. Shipped schema lacks PKs/AUTO_INCREMENT (payment inserts fail) — production must be checked/repaired first. No migration runner.

## Hosting
`@vercel/*` packages and `AIVEN_MIGRATION_GUIDE.md` suggest Vercel + Aiven MySQL, but there is no `vercel.json`, Dockerfile or CI — **Unknown**. Local-filesystem uploads (`public/uploads`) will not persist on serverless hosting.

## Operations
Backups, monitoring, error tracking (no Sentry etc.), structured logging, recovery runbooks: **Not found**. Cron: `/api/cron/membership-reminders` needs an external scheduler with `CRON_SECRET`.

## Deployment blockers
1. Unauthenticated destructive/admin/debug/migration endpoints (S2–S7, S14, S22).
2. Password-reset code disclosure (S1).
3. Payment completion without gateway verification (S9–S11) and dev-only callback signature skip (S12).
4. Schema defects (no PK/AUTO_INCREMENT, no FKs) and unknown prod schema.
5. Conflicting fee engines — amounts charged are undefined.
6. PII committed to git (uploads, dumps).
7. Type errors hidden; lockfile out of sync; no tests.
