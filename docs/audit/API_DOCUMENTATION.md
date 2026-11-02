# API Documentation (inventory)

121 route files under `app/api` (all JSON). Columns are derived automatically from source (`/tmp/inv.py` heuristic: presence of `verifyToken`/`jwtVerify`/session checks, `isAdmin`/`is_admin` checks, `NODE_ENV` guards, SQL write keywords) and then spot-verified at runtime for the routes noted in `SECURITY_AUDIT.md`. "Token check = N" means no authentication call exists in the file. Treat "Y" as "a check exists", not "the check is correct".

Summary: 48 route files have no token check; 20 of them write to the database; 8 `/api/admin/*` routes have no admin-role check.

## Key endpoints (detailed)
| Method | Route | Purpose | Auth / role | Input | DB ops | Notes |
|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | self-registration | public | name,email,password,confirmPassword,nida,membershipType,phone,… | tx: INSERT users, user_profiles | logs body; min length 8 |
| POST | `/api/auth/login` | login, sets `token` cookie (7d) | public | email,password | SELECT users | enumeration; `secure:false` |
| GET | `/api/auth/me` | current user + profile | token | cookie/Bearer | SELECT users ⨝ user_profiles | strips password/refresh_token |
| POST | `/api/auth/logout` | clear cookie | — | — | — | |
| POST | `/api/auth/refresh` | refresh JWT | refreshToken cookie | — | — | dead code |
| POST/PUT | `/api/auth/forgot-password` | send / verify 6-digit code | public | email / email,resetCode,newPassword | UPDATE users | **returns code**; SHA-256 |
| POST | `/api/admin/approve-member` | approve user, init cycles, email | token + DB is_admin | userId,membershipType | UPDATE users, INSERT memberships, cycles | |
| POST | `/api/admin/reject-member` | reject | token + admin | userId,reason | UPDATE/DELETE | |
| GET/PUT/DELETE | `/api/admin/users[/id]` | user admin | token + admin (runtime 403 for member) | | | 55 TS errors in `[id]` |
| GET/POST | `/api/admin/payment` | payment plan / record manual payment | **token only** | userId / userId,selectedYears,amount | INSERT membership_payments, UPDATE users | IDOR (runtime) |
| POST | `/api/admin/payments/[id]/refund` | refund | token claim isAdmin | | UPDATE payments `refunded` | enum mismatch |
| POST | `/api/membership/pay` | member payment | token | type,newUser,paymentMethod,transactionId | INSERT payments(completed), memberships | no gateway; 500 on dump schema |
| POST | `/api/membership/pay-early` | early pay | token | amount | INSERT membership_payments(pending) | client amount |
| POST | `/api/membership/payment-success` | finalize payment | token | reference | UPDATE payments, memberships, cycle tables | no gateway verify |
| GET | `/api/membership/status`, `/payment-status` | status/amount due | token | | SELECT | mixes engines |
| GET | `/api/membership/next-number` | next membership no. | **none** | | UPDATE membership_sequence | runtime 200 |
| POST | `/api/payments/azampay/checkout` | start AzamPay MNO checkout | **none** | userId,amount,phoneNumber,provider,membershipType | CREATE TABLE IF NOT EXISTS, INSERT payments | |
| POST | `/api/payments/azampay/callback` | gateway webhook | signature (prod only) | AzamPay payload | UPDATE payments, memberships | re-checks status |
| POST | `/api/payments/complete` | complete pending payment | **none** | reference,userId? | UPDATE payments/memberships | |
| POST | `/api/payments/cleanup` | delete/alter test payments | **none** | action | DELETE/UPDATE | |
| GET | `/api/reports/generate` | CSV/JSON report export | **none** | type,from,to,columns | SELECT (PII) | runtime 200 |
| GET | `/api/admin/reports/*` (5) | dashboard stats | **none** | | SELECT | runtime 200 |
| GET | `/api/cron/membership-reminders` | reminder emails | `x-cron-secret` / Bearer | | SELECT, INSERT notifications | properly gated |
| GET/POST | `/api/events`, `/api/events/[id]/register` | list / register | token for register | | INSERT event_registrations | capacity race |
| GET/POST | `/api/messages`, `/reply`, `/[id]` | messaging | token, scoped by `decoded.id` | | | |

## Full inventory
| Route | Methods | Token check | Admin check | NODE_ENV gate | DB writes |
|---|---|---|---|---|---|
| `/api/about-content` | GET | N | N |  | read |
| `/api/admin/approve-member` | POST | Y | Y |  | INSERT,UPDATE |
| `/api/admin/cards` | GET | Y | Y |  | read |
| `/api/admin/contact-submissions/[id]` | DELETE | Y | Y |  | DELETE |
| `/api/admin/contact-submissions` | GET/PUT/DELETE | Y | Y |  | DELETE,UPDATE |
| `/api/admin/content/about/[id]` | GET/PUT/DELETE | Y | Y |  | DELETE,UPDATE |
| `/api/admin/content/about` | GET/POST/PUT/DELETE | Y | Y |  | DELETE,INSERT,UPDATE |
| `/api/admin/content/contact/[id]` | GET/PUT/DELETE | Y | Y |  | DELETE,UPDATE |
| `/api/admin/content/contact` | GET/POST/PUT/DELETE | Y | Y |  | DELETE,INSERT,UPDATE |
| `/api/admin/content/footer` | GET/PUT | Y | Y |  | INSERT,UPDATE |
| `/api/admin/content/home/[id]` | GET/PUT/DELETE | Y | Y |  | DELETE,UPDATE |
| `/api/admin/content/home` | GET/POST/PUT/DELETE | Y | Y |  | DELETE,INSERT,UPDATE |
| `/api/admin/content/media` | GET/POST/DELETE | Y | Y |  | DELETE,INSERT |
| `/api/admin/content/navigation` | GET/PUT/POST/DELETE | Y | Y |  | DELETE,INSERT |
| `/api/admin/content/pages/[id]` | GET/PUT/DELETE | Y | Y |  | DELETE,UPDATE |
| `/api/admin/content/pages` | GET/POST | Y | Y |  | INSERT |
| `/api/admin/content/settings` | GET/PUT | Y | Y |  | INSERT,UPDATE |
| `/api/admin/create-admin` | POST | N | Y | Y | INSERT |
| `/api/admin/deleted-users` | GET | Y | Y |  | read |
| `/api/admin/events/[id]/registrations` | GET | Y | Y |  | read |
| `/api/admin/events/[id]` | GET/PATCH/PUT/DELETE | Y | Y |  | DELETE,UPDATE |
| `/api/admin/events` | GET/POST | Y | Y |  | INSERT |
| `/api/admin/fix-admin` | POST | N | Y | Y | DELETE,INSERT |
| `/api/admin/fix-dates` | POST | Y | Y |  | UPDATE |
| `/api/admin/membership/cycles` | GET | Y | Y |  | read |
| `/api/admin/membership/settings` | GET/PUT | Y | Y |  | UPDATE |
| `/api/admin/membership/types` | GET | Y | Y |  | read |
| `/api/admin/news` | GET/POST/PUT/DELETE | Y | N | Y | DELETE,INSERT,UPDATE |
| `/api/admin/payment` | GET/POST | Y | N | Y | INSERT,UPDATE |
| `/api/admin/payments/[id]/refund` | POST | Y | Y |  | UPDATE |
| `/api/admin/payments/[id]` | GET | Y | Y |  | read |
| `/api/admin/payments/list/export` | GET | Y | Y | Y | read |
| `/api/admin/payments/list` | GET | Y | Y | Y | read |
| `/api/admin/payments` | GET/POST | Y | N | Y | INSERT,UPDATE |
| `/api/admin/reject-member` | POST | Y | Y |  | UPDATE |
| `/api/admin/reports/activities` | GET | N | N |  | read |
| `/api/admin/reports/extended` | GET | N | N |  | read |
| `/api/admin/reports/generate` | POST | Y | Y |  | read |
| `/api/admin/reports/membership` | GET | N | N |  | read |
| `/api/admin/reports/payments` | GET | N | N |  | read |
| `/api/admin/reports/summary` | GET | N | N |  | read |
| `/api/admin/reset-admin` | POST | N | Y | Y | INSERT,UPDATE |
| `/api/admin/users/[id]/approve` | PATCH/POST | Y | Y |  | UPDATE |
| `/api/admin/users/[id]/details` | GET | Y | Y |  | read |
| `/api/admin/users/[id]/membership-status` | GET | Y | Y |  | read |
| `/api/admin/users/[id]/password` | POST | Y | Y |  | UPDATE |
| `/api/admin/users/[id]/reject` | POST | Y | Y |  | UPDATE |
| `/api/admin/users/[id]` | GET/PUT/DELETE | Y | Y |  | DELETE,INSERT,UPDATE |
| `/api/admin/users/restore` | POST | Y | Y |  | DELETE,INSERT |
| `/api/admin/users` | GET/POST | Y | Y |  | read |
| `/api/auth/[...nextauth]` | GET/POST | N | N | Y | read |
| `/api/auth/forgot-password` | POST/PUT | N | N | Y | UPDATE |
| `/api/auth/forgot-password/verify` | POST | N | N | Y | read |
| `/api/auth/login` | POST | N | Y |  | read |
| `/api/auth/logout` | POST | N | N | Y | read |
| `/api/auth/me` | GET | Y | Y | Y | read |
| `/api/auth/membership-status` | GET | Y | N | Y | read |
| `/api/auth/profile` | GET/PUT/PATCH | Y | Y | Y | INSERT,UPDATE |
| `/api/auth/refresh` | POST | Y | Y | Y | read |
| `/api/auth/register` | POST | N | N |  | INSERT |
| `/api/contact-content` | GET | N | N |  | read |
| `/api/contact` | POST | N | N |  | INSERT |
| `/api/cron/membership-reminders` | POST/GET | Y | Y |  | read |
| `/api/debug/current-user` | GET | Y | Y |  | read |
| `/api/debug/pricing` | GET | Y | N |  | read |
| `/api/debug/send-email` | POST/GET | N | N |  | read |
| `/api/debug/send-test-email` | GET/POST | N | N |  | read |
| `/api/events/[id]/register` | POST | Y | N |  | INSERT |
| `/api/events` | GET/POST | Y | N |  | INSERT |
| `/api/fix-membership` | POST | N | N |  | UPDATE |
| `/api/home-content` | GET | N | N |  | read |
| `/api/import-all` | POST | N | N |  | ALTER,CREATE TABLE,INSERT |
| `/api/import-complete` | POST | N | N |  | read |
| `/api/import-db` | POST | N | N |  | read |
| `/api/import-tables` | POST | N | Y |  | CREATE TABLE,INSERT,UPDATE |
| `/api/membership/complete-payment` | POST | Y | N |  | INSERT,UPDATE |
| `/api/membership/next-number` | GET | N | N |  | INSERT,UPDATE |
| `/api/membership/pay-early` | POST | Y | N |  | INSERT,UPDATE |
| `/api/membership/pay` | POST | Y | N |  | INSERT,UPDATE |
| `/api/membership/payment-status` | GET | Y | N |  | read |
| `/api/membership/payment-success` | POST | Y | N |  | INSERT,UPDATE |
| `/api/membership/status` | GET | Y | N |  | UPDATE |
| `/api/messages/[id]/read` | POST | Y | N |  | UPDATE |
| `/api/messages/[id]` | DELETE | Y | N |  | DELETE |
| `/api/messages/reply` | POST | Y | N |  | INSERT,UPDATE |
| `/api/messages` | GET/POST | Y | N |  | INSERT |
| `/api/migrate-bulk` | POST | N | N |  | CREATE TABLE,INSERT |
| `/api/migrate-complete` | POST | N | N |  | read |
| `/api/migrate-data` | POST | N | Y |  | CREATE TABLE,UPDATE |
| `/api/migrate-fast` | POST | N | N |  | ALTER,CREATE TABLE,INSERT |
| `/api/migrate-quick` | POST/GET | N | N |  | CREATE TABLE,INSERT |
| `/api/migrate-simple` | POST | N | Y |  | CREATE TABLE,INSERT,UPDATE |
| `/api/migrate-single` | POST/GET | N | N |  | CREATE TABLE,INSERT |
| `/api/news/[id]/read` | POST | Y | N |  | INSERT,UPDATE |
| `/api/news/[id]` | POST | Y | N |  | DELETE,INSERT,UPDATE |
| `/api/news/[id]/unread` | POST | Y | N |  | DELETE |
| `/api/news` | GET/POST | Y | Y | Y | INSERT |
| `/api/payment/pesapal` | POST | Y | N |  | read |
| `/api/payments/activate-test` | POST | Y | N |  | INSERT,UPDATE |
| `/api/payments/azampay/callback` | POST/GET | N | N | Y | read |
| `/api/payments/azampay/checkout` | POST/GET | N | N | Y | CREATE TABLE,DELETE,INSERT,UPDATE |
| `/api/payments/check-payment` | POST | Y | N |  | read |
| `/api/payments/cleanup` | POST/GET | N | N |  | DELETE,UPDATE |
| `/api/payments/complete` | POST/GET | N | N |  | read |
| `/api/payments/create-test` | POST | Y | N |  | INSERT |
| `/api/payments/mobile-money` | POST/GET | N | N |  | CREATE TABLE,DELETE,INSERT,UPDATE |
| `/api/payments/payment-status` | GET | Y | N |  | read |
| `/api/payments/process` | POST/GET | Y | N |  | INSERT,UPDATE |
| `/api/payments` | GET | Y | Y |  | read |
| `/api/reports/generate` | GET | N | N |  | read |
| `/api/reports` | GET | Y | Y |  | read |
| `/api/reports/send-email` | POST | N | N |  | read |
| `/api/send-approval-email` | POST | N | N |  | read |
| `/api/settings` | GET | N | N |  | read |
| `/api/setup/ensure-admin` | POST | N | Y |  | INSERT |
| `/api/test-db` | GET | N | N |  | read |
| `/api/test-echo` | POST | N | N |  | read |
| `/api/test-events` | ? | N | N |  | read |
| `/api/test-simple` | POST | N | N |  | read |
| `/api/user/profile` | PUT/GET | Y | Y |  | UPDATE |
| `/api/verify-migration` | GET | N | Y |  | read |

Heuristic totals: TOTAL 121 noauth 48 noauth+writes 20 admin-path-without-admin-check 8
