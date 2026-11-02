# Repository Structure

| Path | Contents | Classification |
|---|---|---|
| `app/` | Next.js App Router pages (≈45 pages) and `app/api/**/route.ts` (121 API route files) | Active |
| `app/(shared-layout)`, `app/about`, `app/about-us`, `app/contact`, `app/privacy`, `app/terms` | Public/marketing pages (note: middleware forces login even for these — verified runtime 307 → `/auth/login`) | Active |
| `app/auth/*` | login, register, forgot/reset password, pending-approval | Active |
| `app/dashboard/*` | member dashboard, profile, complete-profile, payment, payment-gateways, subscribe, membership-card, events, messages, news | Active |
| `app/admin/*` | dashboard, users, requests, membership, payment(s), reports, events, news, content, cards, contact-submissions | Active |
| `app/fix-auth`, `app/test-membership-card` | developer/test pages shipped in the app | Dev-only in prod build |
| `app/scripts/seed.ts` | seed script (has TS error) | Dev-only |
| `components/` | UI components (forms, tables, charts, `AzamPayIntegration.tsx`, shadcn-style `ui/`) | Active |
| `contexts/` | `AuthContext` (client auth state via `/api/auth/me`) | Active |
| `hooks/` | client hooks | Active |
| `lib/` | `db.ts`, `auth.ts`, membership logic (`membershipCycles.ts`, `enhancedMembershipCycles.ts`, `membership-pricing.ts`, `membershipPayment.ts`, `membership.ts`), payments (`azampay.ts`, `mobile-money.ts`), email (`email.ts`, `email-simple.ts`, `email-config.ts`), `notificationService.ts`, 8 card generators, `db-mock.ts`, `db-utils.ts` (broken: undefined `toId`), **`next_auth(4).sql` — full DB dump incl. user rows** | Mixed |
| `middleware.ts` | page auth gate (Next 16 warns "middleware" is deprecated → `proxy`) | Active |
| `database/` | 59 ad-hoc SQL/.bat scripts: probes, fixes, admin creation, password hash updates, PK repairs | Historical/ops scripts, no runner |
| `migrations/` | 13 SQL migrations with mixed naming schemes, no runner, no tracking table | Partially applied (unknown) |
| `_archive/` | old PHP, `aiven_ready.sql` (identical dump), import scripts | Legacy |
| `api/`, `Database.php`, `config.php`, `jwt.php` | PHP REST API (login/register) — needs `vendor/autoload.php`; no `composer.json` | Legacy, not runnable |
| `convex/_generated` | generated Convex client stubs; no Convex functions/schema | Generated, unused |
| `public/uploads/` | **committed user-uploaded documents and profile pictures** | Sensitive data in VCS |
| `_probe*.out` | probe output files at repo root | Junk |
| `*.md` at root (14 files) | implementation notes (`IMPLEMENTATION_COMPLETE.md`, `MEMBERSHIP_CYCLES_*` …) — claims not treated as evidence | Historical docs |
| `.windsurf/workflows` | AI-editor workflows | Tooling |
| `next.config.js` **and** `next.config.ts` | two configs; `.js` sets `typescript.ignoreBuildErrors: true` | Conflict |

Missing: `README.md`, `AGENTS.md`, `.env.example`, test directory/config, CI config, Dockerfile, pre-commit hooks (`.husky`, `.pre-commit-config.yaml`), `vercel.json`.

`package.json` scripts: `dev`, `build`, `start`, `lint` only — no `test`, no migration script.
`package-lock.json` is out of sync with `package.json` (`npm ci` fails: picomatch mismatch); `npm install` works (902 packages).
