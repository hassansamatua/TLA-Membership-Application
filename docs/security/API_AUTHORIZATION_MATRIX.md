# Phase 0 API Authorization Matrix

Date: 2026-11-02  
Scope: `app/api/**/route.ts` routes present in this repository.

Access levels:

- **Public** — intentionally unauthenticated.
- **Member** — valid JWT for an existing approved member; admins are also permitted where appropriate.
- **Admin** — valid JWT and server-verified `users.is_admin`.
- **Internal** — server/cron secret only.
- **Unavailable** — fail-closed `503` during Phase 0 containment.
- **Dev/test** — fail-closed `503` in all environments during containment.

Central enforcement is implemented by `middleware.ts` calling `authorizeApi()` in `lib/api-security.ts`; route classification is maintained in `lib/api-access.ts`. Server-side checks still remain in individual handlers where present. `403` means an authenticated member lacks the admin role; `401` means authentication is absent/invalid; `503` means the operation is intentionally unavailable.

## Inventory

| API route | Intended access | Phase 0 status / notes |
|---|---:|---|
| `/api/about-content` | Public GET | No change required; read-only site content. |
| `/api/contact-content` | Public GET | No change required; read-only site content. |
| `/api/contact` | Public POST | Contact submission remains public. |
| `/api/home-content` | Public GET | No change required; read-only site content. |
| `/api/settings` | Public GET | Restricted by query to `is_public=1`. |
| `/api/auth/[...nextauth]` | Public | NextAuth auth endpoints allowed by auth path policy. |
| `/api/auth/forgot-password` | Public POST/PUT | Generic response; token never returned; PUT consumes one-time hashed code. |
| `/api/auth/forgot-password/verify` | Public POST | Verifies code without consuming it; bounded attempts. |
| `/api/auth/login` | Public POST | Login retained; cookies are `httpOnly`, `sameSite=lax`, `secure` in production. |
| `/api/auth/logout` | Public | Public logout endpoint. |
| `/api/auth/me` | Member | Own-account data only. |
| `/api/auth/membership-status` | Member | Own membership state. |
| `/api/auth/profile` | Member | Own profile read/update. |
| `/api/auth/refresh` | Public POST | Refresh-token endpoint; missing refresh secret fails safely. |
| `/api/auth/register` | Public POST | Public member registration only; cannot set `is_admin`; approval required. |
| `/api/cron/membership-reminders` | Internal | Requires `x-cron-secret` when `CRON_SECRET` is configured; otherwise forbidden through central policy. |
| `/api/events` | Member GET; Admin non-GET | Members can list/register; event creation is now classified Admin. |
| `/api/events/[id]/register` | Member | Member registration for an event. |
| `/api/messages` | Member | Own sent/received messages. |
| `/api/messages/[id]` | Member | Delete constrained to sender or receiver. |
| `/api/messages/[id]/read` | Member | Read marker constrained to receiver. |
| `/api/messages/reply` | Member | Read/update constrained to message participant. |
| `/api/membership/status` | Member | Own membership status. Currently blocked by outdated test schema (`users.user_category` absent). |
| `/api/membership/payment-status` | Member | Own payment state. |
| `/api/membership/next-number` | Admin | Membership number generation restricted to admin. |
| `/api/membership/complete-payment` | Unavailable | Client-declared completion disabled. |
| `/api/membership/pay` | Unavailable | Direct membership activation disabled pending verified gateway flow. |
| `/api/membership/pay-early` | Unavailable | Direct membership activation disabled pending verified gateway flow. |
| `/api/membership/payment-success` | Unavailable | Client-declared success disabled. |
| `/api/news` | Member | Member-visible news/read state. |
| `/api/news/[id]` | Member | Member-visible news item/read state. |
| `/api/news/[id]/read` | Member | Own read state. |
| `/api/news/[id]/unread` | Member | Own unread state. |
| `/api/payment/pesapal` | Unavailable | Payment mutation disabled pending verified gateway implementation. |
| `/api/payments` | Admin GET | Organization-wide payments restricted to admin. |
| `/api/payments/check-payment` | Member POST | Own payment lookup only. |
| `/api/payments/payment-status` | Member GET | Own payment state. |
| `/api/payments/process` | Member GET; Unavailable POST | Query retained; payment completion disabled. |
| `/api/payments/activate-test` | Dev/test | Disabled. |
| `/api/payments/azampay/callback` | Unavailable | Disabled until official callback verification is configured. |
| `/api/payments/azampay/checkout` | Unavailable | Checkout initiation disabled pending verified flow/spec. |
| `/api/payments/cleanup` | Unavailable | Destructive maintenance disabled. |
| `/api/payments/complete` | Unavailable | Client-declared completion disabled. |
| `/api/payments/create-test` | Dev/test | Disabled. |
| `/api/payments/mobile-money` | Unavailable | Payment mutation disabled pending verified gateway implementation. |
| `/api/reports` | Admin | Reports require server-verified admin. |
| `/api/reports/generate` | Admin | Report generation requires admin. |
| `/api/reports/send-email` | Admin | Report email requires admin and forwards caller credentials internally. |
| `/api/send-approval-email` | Admin | Approval notification requires admin. |
| `/api/user/profile` | Member | Own-profile endpoint. |

## Admin-only routes

All routes below are classified **Admin**. Anonymous requests return `401`; approved non-admin members return `403`.

- `/api/admin/approve-member`
- `/api/admin/cards`
- `/api/admin/contact-submissions`
- `/api/admin/contact-submissions/[id]`
- `/api/admin/content/about`
- `/api/admin/content/about/[id]`
- `/api/admin/content/contact`
- `/api/admin/content/contact/[id]`
- `/api/admin/content/footer`
- `/api/admin/content/home`
- `/api/admin/content/home/[id]`
- `/api/admin/content/media`
- `/api/admin/content/navigation`
- `/api/admin/content/pages`
- `/api/admin/content/pages/[id]`
- `/api/admin/content/settings`
- `/api/admin/deleted-users`
- `/api/admin/events`
- `/api/admin/events/[id]`
- `/api/admin/events/[id]/registrations`
- `/api/admin/membership/cycles`
- `/api/admin/membership/settings`
- `/api/admin/membership/types`
- `/api/admin/news`
- `/api/admin/payment`
- `/api/admin/payments`
- `/api/admin/payments/[id]`
- `/api/admin/payments/[id]/refund`
- `/api/admin/payments/list`
- `/api/admin/payments/list/export`
- `/api/admin/reject-member`
- `/api/admin/reports/activities`
- `/api/admin/reports/extended`
- `/api/admin/reports/generate`
- `/api/admin/reports/membership`
- `/api/admin/reports/payments`
- `/api/admin/reports/summary`
- `/api/admin/users`
- `/api/admin/users/[id]`
- `/api/admin/users/[id]/approve`
- `/api/admin/users/[id]/details`
- `/api/admin/users/[id]/membership-status`
- `/api/admin/users/[id]/password`
- `/api/admin/users/[id]/reject`
- `/api/admin/users/restore`

## Safely unavailable routes

These routes return `503` centrally and, for the AzamPay callback, also fail closed inside the handler.

- `/api/setup/ensure-admin` — unauthenticated admin bootstrap.
- `/api/admin/create-admin` — unsafe admin creation path.
- `/api/admin/fix-admin` — unsafe admin repair.
- `/api/admin/reset-admin` — unsafe admin reset.
- `/api/admin/fix-dates` — unsafe repair utility.
- `/api/fix-membership` — unsafe membership repair.
- `/api/verify-migration` — diagnostic data exposure.
- `/api/import-all`
- `/api/import-complete`
- `/api/import-db`
- `/api/import-tables`
- `/api/migrate-bulk`
- `/api/migrate-complete`
- `/api/migrate-data`
- `/api/migrate-fast`
- `/api/migrate-quick`
- `/api/migrate-simple`
- `/api/migrate-single`
- `/api/debug/current-user`
- `/api/debug/pricing`
- `/api/debug/send-email`
- `/api/debug/send-test-email`
- `/api/test-db`
- `/api/test-echo`
- `/api/test-events`
- `/api/test-simple`
- `/api/payments/cleanup`
- `/api/payments/activate-test`
- `/api/payments/create-test`
- `/api/payments/complete`
- `/api/payments/mobile-money`
- `/api/payments/azampay/checkout`
- `/api/payments/azampay/callback`
- `/api/payment/pesapal`
- `/api/membership/complete-payment`
- `/api/membership/pay`
- `/api/membership/pay-early`
- `/api/membership/payment-success`
- `/api/payment-success`
- `/api/complete-payment`

## Non-API development pages

| Page | Status |
|---|---|
| `/fix-auth` | `404` through middleware. |
| `/test-membership-card` | `404` through middleware. |
