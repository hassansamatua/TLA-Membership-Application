# Testing and Quality Report

Environment: Ubuntu VM, Node 20.18.1, npm, MySQL 8.0 container with dump loaded. No production systems used.

| Check | Command | Result (actual) |
|---|---|---|
| Clean install | `npm ci` | **Failed** — `package.json` and `package-lock.json` out of sync (picomatch 2.3.1 vs 4.0.7 / 2.3.2 missing) |
| Install | `npm install --no-audit --no-fund` | Succeeded, 902 packages (modifies lockfile; reverted after audit) |
| Type check | `npx tsc --noEmit -p .` | **Failed — 147 errors** (TS2347 ×72, TS2339 ×59, TS2304 ×7 …); worst files: `app/api/admin/users/[id]/route.ts` (55), `app/api/admin/reports/extended/route.ts` (18), `lib/db-utils.ts` (9, undefined `toId`), `app/api/admin/events/[id]/route.ts` (9) |
| Lint | `npx eslint .` | **Failed — 677 problems (454 errors, 223 warnings)** |
| Production build | `npx next build` | Exit 0, but output says "Skipping validation of types" because `next.config.js` sets `typescript.ignoreBuildErrors: true` |
| Unit/integration/E2E tests | — | **None exist** (no test files, no test script, no framework configured) |
| Dependency audit | `npm audit --omit=dev` | 68 vulnerabilities: 5 critical, 41 high, 20 moderate, 2 low (largely via `vercel` CLI listed in `dependencies`) |
| Business-rule tests | ad-hoc `tsx` script (see BUSINESS_LOGIC_AUDIT §2) | Executed; revealed BL1, BL3, BL4 |
| Runtime smoke | `next dev` + curl | Executed; results in SECURITY_AUDIT (S6, S8, S16, S18) and DATABASE_AUDIT (D2) |

## Workflows verified at runtime
- Register → 201 (verified). Login unapproved/approved (verified after DB approval). Member blocked from `/api/admin/users` (403) and `/admin` pages (redirect) — verified.
- Member payment (`/api/membership/pay`) → **500** `Field 'id' doesn't have a default value` (verified, shipped schema).
- Admin manual payment → **500** same cause (verified, triggered by a non-admin).
- `/api/test-db` → 500 (SQL syntax error `current_time`) — the route itself is broken.

## Not verified (needs credentials/sandbox)
AzamPay checkout/callback end-to-end, SMTP delivery, Pesapal, file uploads, PDF card rendering visual correctness, cron scheduling.

## Quality observations
- `strict: false`, `allowJs`, `any`-heavy code; duplicated modules (4 fee engines, 8 card generators, 3 email libs, `route_original.ts` copies).
- Very verbose `console.log` of request bodies, payment rows and password-derived data.
- No CI, no pre-commit hooks, no README/onboarding docs.
