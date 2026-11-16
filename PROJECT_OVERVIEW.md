# Project Overview — TLA Membership Management Application

Audit date: 2026-11-02 · Auditor: Devin (Cognition AI) · Scope: repository `hassansamatua/TLA-Membership-Application` (default branch, local checkout) plus a **disposable local MySQL 8 database rebuilt from the repo's SQL dump**. No production system, credential or data was contacted.

## What the application actually is
A single Next.js 16 (App Router) application that serves both the UI and a REST-style JSON API (`app/api/**/route.ts`, 121 route files) on top of a MySQL database accessed with raw SQL through `mysql2` (`lib/db.ts`). Authentication is a hand-written JWT cookie scheme (`lib/auth.ts`, `middleware.ts`).

Functional areas that have real code paths (see `FEATURE_MATRIX.md` for status):
- Member self-registration → admin approval → login (`app/api/auth/register`, `app/api/admin/approve-member`, `app/api/auth/login`).
- Member profile / profile completion, member dashboard, membership card PDF generation (8 different card generators in `lib/membershipCard*.ts`).
- Annual membership cycle (Feb 1 – Jan 31), fees and penalties — implemented **four different, mutually inconsistent ways** (see `BUSINESS_LOGIC_AUDIT.md`).
- Payments: AzamPay checkout/callback, a generic "mobile money" route, a Pesapal stub, a self-service "pay" route that records a payment as completed without any gateway, admin manual payment recording and refunds.
- Admin: approve/reject members, users CRUD + soft-delete/restore, events + registrations, news/notifications, CMS content (home/about/contact/navbar/footer), reports & charts, membership card management.
- Messaging between users, contact form, news notifications.
- Many one-off migration, import, "fix", debug and test endpoints that are deployed as part of the same app.

## Real technology stack (verified from code, not README — there is no README)
Next.js 16.1.1 · React 19.2.3 · TypeScript 5 (`strict: false`) · Tailwind 4 · MySQL via `mysql2` · `jsonwebtoken` + `bcryptjs` · `nodemailer` · `jspdf`/`html2canvas` · Recharts/Chart.js · AzamPay HTTP API. Installed but unused/legacy: `next-auth` (one route), `better-auth`, `convex` (generated stubs only), `mssql`, `resend` (unclear), PHP API (`api/`, `Database.php`, `jwt.php`) that cannot run (no `composer.json`/`vendor`).

## Bottom line
The application has broad feature coverage on the surface, but it is **not production-ready**. Verified blockers include unauthenticated administrative/destructive/data-export endpoints, a password-reset endpoint that returns the reset code to the caller, payment flows that can mark payments completed without gateway confirmation, a shipped schema with no foreign keys and missing primary keys/AUTO_INCREMENT on the payment tables (payment inserts fail at runtime against it), four contradicting fee/penalty implementations, 147 TypeScript errors hidden by `ignoreBuildErrors`, 454 ESLint errors, no automated tests, and committed personal data (user uploads, a database dump with user rows).

See `MASTER_TECHNICAL_AUDIT_REPORT.md` for the consolidated findings and `IMPROVEMENT_ROADMAP.md` for the prioritized plan.

## Evidence conventions
- **Verified (runtime)** = reproduced against the local dev server + local DB.
- **Verified (source)** = read in code, exact file/function cited.
- **Verified (test script)** = executed the library function with `tsx` (`/tmp/bl/t.ts`, reproduced in `BUSINESS_LOGIC_AUDIT.md`).
- **Unknown** = depends on production configuration/data that was not available.
