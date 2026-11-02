# Business Logic Audit — Membership Cycles, Fees, Penalties

Rules as stated in the audit brief / project docs: TSh 50,000 annual fee; cycle Feb 1 – Jan 31; grace Feb 1 – Mar 31; TSh 1,000/month penalty from April 1; advance payment Oct – Jan; first joining cycle exempt from penalties. **No rule was changed during this audit.**

## 1. There are four fee/penalty engines (+ route-local math)
| Engine | File / function | Fee | Penalty | Used by |
|---|---|---|---|---|
| Legacy cycles | `lib/membershipCycles.ts` `MEMBERSHIP_CYCLE_CONFIG`, `calculatePenalty`, `calculateTotalAmountDue` | 50,000 | 1,000/month, but off-by-one (see §2) | `admin/approve-member` (`initializeUserCycles`), `payments/process`, `membership/payment-status`, `membership/status` |
| Enhanced cycles | `lib/enhancedMembershipCycles.ts` `getMembershipFee`, `calculateEnhancedPenalties` | 40,000 first year / 30,000 renewal (librarian & regular), 150,000 organization | 1,000/month from Apr 1 | `membership/payment-success`, `membership/status`, cron reminders |
| Client pricing | `lib/membership-pricing.ts` `calculateMembershipPricing`, `getMembershipStatus` | 40k/30k/150k | 1,000/month, calendar-year based | dashboard pages |
| Admin plan | `lib/membershipPayment.ts` `MEMBERSHIP_FEE`, `PENALTY_FEE`, `calculatePaymentPlan` | 50,000 | **10,000 flat per late year** | `admin/payment` |
| Route-local | `app/api/membership/pay/route.ts` | 40k/30k/150k from body flag `newUser` | **10% of base** after Mar 31 | member "pay" button |
| Route-local | `app/api/membership/pay-early/route.ts` | client-supplied `amount` | none | early pay |
| DB | `membership_cycles.base_fee` = 50,000; function `calculate_membership_fee` | 50,000 | 1,000 | not read by main flows |

**Consequence:** the same member can be quoted 30,000, 40,000 or 50,000 and a penalty of 1,000/month, 10% or 10,000/year depending on which screen/route is used. The documented TSh 50,000 rule is only honoured by the legacy engine and the admin plan.

## 2. Boundary tests (executed with `tsx`, TZ = Africa/Dar_es_Salaam, UTC, America/New_York — identical results unless noted)
Renewal member, unpaid current cycle:

| Date | Cycle (legacy `getCycleYearForDate`) | Legacy `calculatePenalty` | Enhanced `calculateEnhancedPenalties` (months) | Expected by rule |
|---|---|---|---|---|
| 2026-01-31 | 2025 | 12,000 | 10,000 (10) | 10,000 |
| 2026-02-01 | 2026 | 0 | 0 | 0 |
| 2026-03-31 | 2026 | 0 | 0 | 0 |
| 2026-03-31 23:30 | 2026 | 0 | 0 | 0 |
| 2026-04-01 | 2026 | **2,000** | 1,000 (1) | 1,000 |
| 2026-04-30 | 2026 | **2,000** | 1,000 | 1,000 |
| 2026-05-01 | 2026 | **3,000** | 2,000 | 2,000 |
| 2026-12-31 | 2026 | 10,000 | 9,000 | 9,000 |
| 2027-01-31 | 2026 | 12,000 | 10,000 | 10,000 |
| 2028-02-29 (leap) | 2028 | 0 | 0 | 0 ✓ |
| 2028-04-01 | 2028 | 2,000 | 1,000 | 1,000 |
| Unpaid 2025 cycle evaluated 2026-06-15 | — | 17,000 | 15,000 (15) | undefined by rules (no cap) |

Findings:
- **BL1 (High)** `lib/membershipCycles.ts#getMonthsSinceCycleStart/calculatePenalty` counts April as 2 months → overcharges 1,000 every month vs. rule. Verified by test.
- **BL2** Penalties are uncapped and keep accruing after the cycle ends (15–17 months for a prior cycle). Rule does not specify; requires business decision.
- **BL3 (Medium)** `canPayEarlyForNextCycle` returns `true` for Oct 1 but `false` for Jan 10 (`getMonth() >= 9`) — January is excluded from the documented Oct–Jan window. `pay-early` route uses yet another rule (`month >= 3`, due date "Mar 30", comments about Jan–Feb).
- **BL4 (Medium)** `enhancedMembershipCycles.toMySqlDate(new Date('2026-02-01T00:00'))` returns `2026-01-31` when TZ=Africa/Dar_es_Salaam (uses `toISOString`). Dates written with it are one day early in the production timezone.
- **BL5 (Low/Med)** `membership-pricing.ts` sets grace end at Mar 31 00:00 local, so a payment during the day on Mar 31 is already "late".
- **BL6 (High)** First-cycle exemption: enhanced `isUserNew()` = "has no paid rows in `cycle_payment_status`". A member who never pays stays "new" indefinitely → never penalised, always charged the first-year fee. `cycle_payment_status` is empty in the dump, so every member is currently "new". Legacy `calculateTotalAmountDue` ignores exemption entirely.
- **BL7 (High)** `membership/pay` charges a 10% penalty (3,000/4,000) after Mar 31 regardless of months — contradicts every engine.
- **BL8** `users.user_category` does not exist → `getUserCategory()` always falls back to `regular`; librarian/regular distinction has no effect (fees are equal anyway).

## 3. Scenario coverage
| Scenario | Behaviour found | Status |
|---|---|---|
| Partial payment | No concept of balance; amount is either client-supplied (`pay-early`, `complete-payment`, AzamPay checkout) or recomputed; underpayment not detected except in `admin/payment` (exact-match check) | Not implemented |
| Multiple unpaid cycles | `payment-success` supports `target_cycle_year` + `cycle_count`; legacy `getUnpaidCycles` exists; `admin/payment` multi-year selection | Partially implemented |
| Duplicate payments | `admin/payment` checks paid years; other routes don't; no UNIQUE on reference/cycle | Partially implemented |
| Advance payment | Three inconsistent windows; `pay-early` stores pending rows only | Broken/inconsistent |
| Reversal/refund | `admin/payments/[id]/refund` writes `status='refunded'` not in enum → fails (strict) / corrupts (non-strict); membership not reverted | Broken |
| Outstanding balance | Computed on the fly per engine; never persisted consistently (`users.total_penalties` not maintained) | Partially implemented |
| Cycle transition | Legacy and enhanced agree Jan 31 → Feb 1 | Implemented (engine level) |
| Leap year | Feb 29 handled | Implemented (engine level) |

## 4. Decisions needed from TLA (not changed)
1. Which fee schedule is authoritative (50k flat vs 40k first/30k renewal/150k org)?
2. Penalty cap and treatment of multiple missed cycles.
3. Exact advance-payment window (Oct–Jan inclusive?).
4. Definition of "first joining cycle" (by join date, not by "never paid").
