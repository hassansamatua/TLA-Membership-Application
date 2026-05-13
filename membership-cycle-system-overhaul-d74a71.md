# Membership Cycle, Payment, Notification & Admin-Tools Overhaul

Consolidate the TLA membership system around a single Feb 1 – Jan 31 cycle: correct fees, accurate penalties, new-member exemption, automated pre-cycle reminders, and admin bulk card / report tools — by reusing the existing `lib/enhancedMembershipCycles.ts` and `lib/notificationService.ts` as the canonical sources of truth and retiring stale duplicates.

---

## 1. Current state (what already exists)

| Area | Status |
|---|---|
| Cycle math (Feb 1 → Jan 31, grace ends Mar 31, penalty 1000/mo from Apr 1, new-user exempt) | ✅ Correct in `@c:\xampp\htdocs\Copy of tutorial2\lib\enhancedMembershipCycles.ts` |
| Fees: new regular/librarian 40k, continuing 30k, organization 50k | ✅ Correct in `enhancedMembershipCycles.ts` |
| Duplicate / inconsistent fee logic | ⚠️ `@c:\xampp\htdocs\Copy of tutorial2\lib\membershipCycles.ts` (BASE_FEE=50000 hard-coded), `@c:\xampp\htdocs\Copy of tutorial2\lib\membership-pricing.ts` (uses calendar year, not cycle year), `@c:\xampp\htdocs\Copy of tutorial2\lib\membership.ts` (`expiry_date = CURDATE() + 1 year` instead of cycle end Jan 31) |
| `/api/membership/status` | ⚠️ Just fixed the `memberships` fallback; uses correct `enhancedMembershipCycles` |
| `/api/membership/payment-success` | ⚠️ Sets `expiry_date = CURDATE() + 1 YEAR` — should be Jan 31 of cycle end |
| Notification service (email + SMS templates) | ✅ Exists in `@c:\xampp\htdocs\Copy of tutorial2\lib\notificationService.ts` (approval, grace, penalty, payment-confirm). Hard-coded "50,000 TZS" in approval email — must use computed fee. |
| Scheduler / cron to send reminders | ❌ Missing |
| "1 month before next cycle" reminder (Jan 1) | ❌ Missing (only mid-grace and post-penalty exist) |
| `penalty_notifications` table | ⚠️ Referenced by `notificationService.recordNotification`; must verify it exists |
| Admin single-card view + download | ✅ `@c:\xampp\htdocs\Copy of tutorial2\app\admin\cards\page.tsx` |
| Admin **bulk** card download as PDF | ❌ Current bulk download is **CSV only**; print uses plain HTML, not the SVG card |
| Admin reports (`/api/admin/reports/{summary,membership,payments,activities,generate}`) | ✅ Routes exist; logic needs to be reviewed for cycle-aware figures |
| User payment page | ✅ `@c:\xampp\htdocs\Copy of tutorial2\app\dashboard\payment\page.tsx` (reads `/api/membership/status`) |

---

## 2. Open questions (need confirmation before implementation)

1. **Organization renewal fee** — only "50,000 for new organization" was specified. Assume the same 50,000 TZS per cycle every year (no renewal discount)? Existing code already does this.
2. **Notification channel** — auto-reminders via email only, or email + SMS? Twilio is stubbed but not wired. Default to **email only** unless told otherwise.
3. **Scheduler mechanism** — no Node cron runs in this dev setup. Acceptable approach: expose a protected `POST /api/cron/membership-reminders` endpoint that an external scheduler (Windows Task Scheduler, GitHub Actions, or a managed cron service) hits daily. Confirm OK.
4. **Bulk admin card export format** — preference: (a) one multi-page PDF, one card per page, or (b) ZIP of individual PDFs? Default to **(a) one multi-page PDF**.
5. **Report exports** — keep current JSON UI + add CSV/PDF download buttons? Date-range filter required? Default: add **CSV download** per report; pre-existing date filters retained.
6. **Penalty calculation precision** — current code uses `(now − Apr 1) / 30 days`. Rule says "1000 per month". Switch to *whole calendar months elapsed since Apr 1* (Apr=1, May=2, …) so May 15 = 2 months × 1000 = 2000? Default **yes**.

---

## 3. Implementation plan (after confirmation)

### Phase A — Single source of truth for cycle + fees
- Promote `@c:\xampp\htdocs\Copy of tutorial2\lib\enhancedMembershipCycles.ts` as canonical.
- Rewrite `lib/membership-pricing.ts` and `lib/membershipCycles.ts` to thin re-exports that call `enhancedMembershipCycles`, preserving public symbols so the rest of the app keeps compiling.
- Adjust `calculateEnhancedPenalties` to count whole calendar months from Apr 1 (per Q6).
- Fix `expiry_date` everywhere a payment is recorded: use `getEnhancedCycleDates(cycleYear).cycleEnd` (= Jan 31 of cycle+1), not `CURDATE() + 1 year`. Files: `@c:\xampp\htdocs\Copy of tutorial2\app\api\membership\payment-success\route.ts`, `@c:\xampp\htdocs\Copy of tutorial2\lib\membership.ts`, `@c:\xampp\htdocs\Copy of tutorial2\app\api\admin\payment\route.ts`, `@c:\xampp\htdocs\Copy of tutorial2\app\api\admin\payments\route.ts`.
- Ensure every payment write also upserts `cycle_payment_status (user_id, cycle_year, is_paid, amount_paid, penalty_amount, total_amount, payment_reference, status)` and `user_membership_status` so `/api/membership/status` returns consistent data.

### Phase B — Notification service hardening
- Add `sendUpcomingCycleReminder(userId, cycleYear, baseFee)` to `notificationService.ts` — fired Jan 1 of cycle-end year for active members, message: "Your next cycle (Feb 1 – Jan 31) begins in one month. Pay between Feb 1 and Mar 31 to avoid the 1,000 TZS/month penalty."
- Patch existing `sendApprovalNotification` to compute the fee from `getMembershipFee` (not the hard-coded 50,000).
- Verify/create `penalty_notifications` table; add `notification_type` enum value `'upcoming_cycle_reminder'`.
- Add idempotency: a user should not receive the same `(cycle_year, notification_type)` twice — check `penalty_notifications` before sending.

### Phase C — Reminder scheduler endpoint
- Create `@c:\xampp\htdocs\Copy of tutorial2\app\api\cron\membership-reminders\route.ts` (POST, secured by `CRON_SECRET` env var).
- On each call, run the following passes for "today":
  - **Jan 1** → `sendUpcomingCycleReminder` to every active member whose next cycle they have not yet paid.
  - **Mar 15** → `sendGracePeriodReminder` to unpaid current-cycle members (skip new users).
  - **Apr 1** (and 1st of each month thereafter) → `sendPenaltyWarning` to overdue continuing members, with current penalty figure.
- Document the recommended Windows Task Scheduler / cron command (`curl -X POST -H "x-cron-secret: …" http://localhost:3000/api/cron/membership-reminders`).
- Add a manual "Run reminders now" button in the admin dashboard for testing.

### Phase D — Admin bulk membership-card export
- Add `@c:\xampp\htdocs\Copy of tutorial2\app\api\admin\cards\bulk-pdf\route.ts` (POST `{ userIds: number[] }`).
  - On the server: fetch each member's data, render the same SVG markup the `MembershipCard` component uses (extract a shared `lib/membershipCardSvg.ts` template so the front-end and back-end stay in lock-step).
  - Use `jsPDF` server-side via the existing client lib refactored, OR generate a single PDF on the client using the data fetched in bulk. Default: **client-side bulk PDF** to reuse `lib/membershipCardDirect.ts` rasterizer (already SVG-to-PNG, no html2canvas, no `lab()` crash).
- Replace `handleBulkDownload` (currently CSV) with a new "Download Cards (PDF)" button that:
  1. Iterates over `selectedCards`.
  2. For each, builds the card SVG → rasterises via the new `lib/membershipCardDirect.renderCardSvgToCanvas`.
  3. Appends each PNG as a new page to a single `jsPDF` document at the card aspect ratio.
  4. Saves as `tla-membership-cards-YYYYMMDD.pdf`.
- Keep CSV as a secondary "Export List (CSV)" button for spreadsheet workflows.
- Rewrite `handleBulkPrint` to open one print window containing all rasterised PNGs (4 cards/page A4) — pixel-perfect with the displayed card, no Tailwind `oklch()` issues.

### Phase E — Admin reports cycle-awareness + exports
- Audit each route in `@c:\xampp\htdocs\Copy of tutorial2\app\api\admin\reports\`:
  - `summary` — total members, by category, paid this cycle, unpaid, in penalty.
  - `membership` — full member list with `cycle_year`, `paid/unpaid`, current fee+penalty.
  - `payments` — date range, by method, totals, by cycle.
  - `activities` — recent payments, approvals, rejections, reminders sent.
- Add `?format=csv` to each, streaming a CSV download.
- Add an admin UI button "Download report (CSV)" next to each existing report.
- (Optional, behind a question) add PDF export of the summary dashboard.

### Phase F — User-facing payment flow polish
- On `@c:\xampp\htdocs\Copy of tutorial2\app\dashboard\payment\page.tsx`, ensure the displayed amount uses the `totalDue` from `/api/membership/status` (so it always equals base + penalty) and shows a breakdown row.
- Show a banner on the dashboard if `cycle.dueDate − today ≤ 30 days` and user hasn't paid — mirrors the email reminder.
- Display the user's category (regular / librarian / organization) and whether the current fee is the new-member or renewal rate, so the figure is transparent.

### Phase G — Cleanup & migration
- Migration file `database/2026_membership_cycle_canonical.sql` that:
  - Backfills missing `cycle_year` on `membership_payments` rows using `getCycleYearForDate(payment_date)`.
  - Recomputes `memberships.expiry_date` to the cycle end (Jan 31) for all rows where it was set to `payment_date + 1 year`.
  - Adds `penalty_notifications.notification_type` enum value `'upcoming_cycle_reminder'` if missing.
- Mark `lib/membershipCycles.ts` and `lib/membership-pricing.ts` as deprecated re-exports with `@deprecated` JSDoc.

---

## 4. Test plan (will be run after implementation)

1. **Fee correctness** — Jest-style unit tests on `enhancedMembershipCycles` covering: new regular Feb-15 → 40k, continuing regular Apr-15 → 30k + 1×1000, organization Jun-15 → 50k + 3×1000, new librarian Aug-1 → 40k (no penalty).
2. **Cycle math** — `getCycleYearForDate(2026-01-15) === 2025`, `getCycleYearForDate(2026-02-01) === 2026`.
3. **Payment flow end-to-end** — Create test user → call `/api/payments/create-test` → call `/api/membership/payment-success` → expect `memberships.expiry_date = 2027-01-31`, `cycle_payment_status (userId, 2026, true)` row, `/api/membership/status.canAccessIdCard = true`, `/dashboard/membership-card` renders the card.
4. **Reminder cron** — invoke `POST /api/cron/membership-reminders` with a mocked "today" of Jan 1, Mar 15, Apr 1 and assert correct `penalty_notifications` rows + email transcripts in dev log.
5. **Admin bulk PDF** — select 3 members on `/admin/cards`, click "Download Cards (PDF)", verify a 3-page PDF with the logo + photos + correct numbers.
6. **Reports CSV** — hit `/api/admin/reports/summary?format=csv` and confirm a well-formed CSV with cycle-aware totals.

---

## 5. Out of scope (explicit non-goals for this iteration)

- New PSP (AzamPay/Stripe/etc.) integration changes.
- Front-end visual redesign beyond the payment page banner.
- Migration to a managed cron provider — only the endpoint + docs.
- Multi-currency.

---

## 6. Files that will change (estimated)

- `lib/enhancedMembershipCycles.ts` — tighten penalty math
- `lib/notificationService.ts` — new reminder type, fee fix, idempotency
- `lib/membershipCycles.ts`, `lib/membership-pricing.ts`, `lib/membership.ts` — deprecate / delegate
- `lib/membershipCardSvg.ts` *(new)* — shared SVG template for card
- `lib/membershipCardDirect.ts` — extend to bulk
- `app/api/membership/payment-success/route.ts` — fix expiry_date, write `cycle_payment_status`
- `app/api/admin/payment/route.ts`, `app/api/admin/payments/route.ts` — same fix
- `app/api/admin/cards/bulk-pdf/route.ts` *(new)*
- `app/api/cron/membership-reminders/route.ts` *(new)*
- `app/api/admin/reports/{summary,membership,payments,activities}/route.ts` — add `?format=csv`
- `app/admin/cards/page.tsx` — new bulk PDF button, refactored print
- `app/admin/dashboard/page.tsx` — "Run reminders now" button
- `app/admin/reports/page.tsx` — CSV download buttons
- `app/dashboard/payment/page.tsx` — breakdown row, reminder banner
- `database/2026_membership_cycle_canonical.sql` *(new migration)*

Total: ~16 files touched, ~3 new files, ~1 migration.
