# Feature Matrix

| Feature | Status | Key evidence |
|---|---|---|
| Member self-registration | Implemented and verified | runtime 201; `app/api/auth/register` |
| Login / logout (JWT cookie) | Implemented and verified | runtime login; `app/api/auth/login` |
| Token refresh | Broken (dead code) | `app/api/auth/refresh` reads cookie never set; wrong claim |
| Password reset | Implemented but insecure (Critical) | returns code (S1); SHA-256 storage |
| Admin approval of members | Implemented but not tested | `app/api/admin/approve-member` |
| Rejection | Implemented but not tested | `admin/reject-member` |
| Suspension / termination | Not found | enum value only |
| Soft delete / restore users | Implemented but not tested | `deleted_users`, `admin/users/restore` |
| Profile / profile completion | Partially implemented | category column missing; dual type vocabularies |
| Member search/filter (admin) | Implemented but not tested | `app/admin/users` |
| Bulk actions/export (admin users) | Documented but not implemented | `TODO` in `app/admin/users/page.tsx` |
| RBAC beyond admin/member (finance officer) | Not found | only `is_admin` |
| Annual cycle Feb–Jan | Partially implemented | engines agree on dates; routes disagree |
| Grace period Feb 1–Mar 31 | Partially implemented | correct in engines; pricing lib 1 day early |
| Penalty 1,000/month from Apr 1 | Partially implemented / inconsistent | enhanced correct; legacy +1 month; pay route 10%; admin 10k/yr |
| TSh 50,000 fee | Partially implemented | only legacy engine/admin plan/DB; most code 40k/30k |
| Advance payment Oct–Jan | Broken | Jan excluded; `pay-early` other window; pending only |
| First-cycle penalty exemption | Partially implemented (flawed) | "never paid" = new forever |
| Multiple unpaid cycles | Partially implemented | `payment-success` cycle_count; admin multi-year |
| Partial payments / balances | Not found | |
| Duplicate-payment prevention | Partially implemented | only `admin/payment`; no UNIQUE |
| AzamPay checkout + callback | Implemented but not tested | no sandbox creds; unauth checkout; callback sig dev-skip |
| Pesapal / direct MNO | Partially implemented | env placeholders |
| Self-service "pay" | Broken | runtime 500; bypass design |
| Admin manual payment | Broken | runtime 500; no admin check |
| Refunds/reversals | Broken | enum mismatch, membership not reverted |
| Receipts | Partially implemented | client PDFs, no receipt ledger |
| Payment history | Implemented but not tested | |
| Membership numbers | Partially implemented | 4 generators, divergent values |
| Membership cards (PDF) | Implemented but not tested | 8 generators |
| Admin dashboard & charts | Implemented but not tested | data includes orphans/test rows |
| Reports & export | Implemented, verified reachable — insecure | runtime 200 unauthenticated |
| Email notifications | Implemented but not tested | SMTP needed |
| SMS notifications | Documented but not implemented | stub |
| Reminder cron | Implemented but not tested | `CRON_SECRET` gate OK |
| In-app news notifications | Implemented but not tested | |
| Messaging | Implemented but not tested | `messages` table absent from dump |
| Events CRUD & registration | Implemented but not tested | TS errors in admin events |
| Event payments | Partially implemented | |
| Attendance | Not found (schema only) | 0 rows, no writer |
| CMS content | Implemented but not tested | |
| Contact form | Implemented but not tested | no rate limit |
| Audit logging | Not found | tables never written |
| Automated tests | Not found | |
| PHP API | Broken (legacy) | no vendor/composer |
| NextAuth / better-auth / Convex | Installed, unused | |
