import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import {
  ENHANCED_MEMBERSHIP_CONFIG,
  getMembershipFee,
  calculateEnhancedPenalties,
} from '@/lib/enhancedMembershipCycles';
import { getCycleYearForDate } from '@/lib/membershipCycles';
import {
  sendUpcomingCycleReminder,
  sendGracePeriodReminder,
  sendPenaltyWarning,
  hasNotificationBeenSent,
} from '@/lib/notificationService';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint: POST/GET /api/cron/membership-reminders
 *
 * Schedules (idempotent on a per-user/per-cycle basis):
 *   - Jan 1 – Jan 31  → upcoming-cycle reminder for cycle = current calendar year
 *                       (cycle that starts Feb 1 of current year)
 *   - Mar 15 – Mar 31 → grace-period reminder for active cycle (unpaid members,
 *                       excluding brand-new joiners)
 *   - Apr 1 onwards   → monthly penalty warning for overdue continuing members
 *                       (capped to once per calendar month per user)
 *
 * Auth: require `x-cron-secret` header matching env `CRON_SECRET`. If
 * `CRON_SECRET` is not set, the route requires an `Authorization: Bearer`
 * with an admin token (manual trigger from an admin session).
 *
 * Query string overrides for testing:
 *   ?date=YYYY-MM-DD  → simulate "today"
 *   ?dryRun=1         → log target users but don't actually send
 */

interface CronResult {
  date: string;
  cycleYear: number;
  dryRun: boolean;
  sent: {
    upcomingCycleReminders: number;
    gracePeriodReminders: number;
    penaltyWarnings: number;
  };
  skipped: number;
  errors: string[];
}

async function authorize(request: NextRequest): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = request.headers.get('x-cron-secret');
    if (provided === cronSecret) return { ok: true };
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 }),
    };
  }
  // Fallback: allow admins by Authorization: Bearer <token>
  try {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: 'CRON_SECRET not configured and no admin bearer token provided' },
          { status: 401 }
        ),
      };
    }
    const { verifyToken } = await import('@/lib/auth');
    const decoded = verifyToken(auth.slice('Bearer '.length)) as any;
    if (!decoded?.is_admin) {
      return {
        ok: false,
        response: NextResponse.json({ success: false, message: 'Admin required' }, { status: 403 }),
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }),
    };
  }
}

function resolveCategory(uc?: string | null, mt?: string | null): 'librarian' | 'organization' | 'regular' {
  const v = (uc || mt || '').toLowerCase();
  if (v.includes('organ')) return 'organization';
  if (v.includes('librar')) return 'librarian';
  return 'regular';
}

/**
 * Has this user received any penalty_warning for this cycle in the current
 * calendar month? Used to cap penalty notifications at one per month.
 */
async function penaltyWarningSentThisMonth(
  userId: number,
  cycleYear: number,
  now: Date
): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [rows] = (await connection.query(
      `SELECT id FROM penalty_notifications
        WHERE user_id = ? AND cycle_year = ?
          AND notification_type = 'penalty_warning'
          AND sent_date >= ? AND sent_date < ?
        LIMIT 1`,
      [userId, cycleYear, monthStart, monthEnd]
    )) as [RowDataPacket[], any];
    return rows.length > 0;
  } catch {
    return false;
  } finally {
    connection.release();
  }
}

async function fetchActiveMembers(): Promise<RowDataPacket[]> {
  const connection = await pool.getConnection();
  try {
    // We want approved users with at least basic contact info. We left-join
    // user_membership_status to detect first_membership_cycle / is_new_member.
    const [rows] = (await connection.query(
      `SELECT u.id AS user_id,
              u.name,
              u.email,
              u.user_category,
              u.membership_type,
              u.is_new_member AS u_is_new,
              ums.is_new_member AS ums_is_new,
              ums.first_membership_cycle,
              m.joined_date
         FROM users u
    LEFT JOIN user_membership_status ums ON ums.user_id = u.id
    LEFT JOIN memberships m ON m.user_id = u.id
        WHERE u.is_approved = 1
          AND (u.role IS NULL OR u.role <> 'admin')
          AND u.email IS NOT NULL AND u.email <> ''`
    )) as [RowDataPacket[], any];
    return rows;
  } finally {
    connection.release();
  }
}

async function isCyclePaid(userId: number, cycleYear: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const [rows] = (await connection.query(
      `SELECT is_paid FROM cycle_payment_status
        WHERE user_id = ? AND cycle_year = ? LIMIT 1`,
      [userId, cycleYear]
    )) as [RowDataPacket[], any];
    if (rows.length && rows[0].is_paid) return true;
    // Fallback: any completed payment recorded for this cycle in membership_payments
    const [mpRows] = (await connection.query(
      `SELECT id FROM membership_payments
        WHERE user_id = ? AND cycle_year = ? AND status = 'completed' LIMIT 1`,
      [userId, cycleYear]
    )) as [RowDataPacket[], any];
    return mpRows.length > 0;
  } catch {
    return false;
  } finally {
    connection.release();
  }
}

function isNewForCycle(member: RowDataPacket, cycleYear: number): boolean {
  // Treat the member as "new for this cycle" (penalty-exempt) when their
  // first membership cycle is this cycle, or when the user_membership_status
  // / users table flags them as new and we have no earlier history.
  if (member.first_membership_cycle === cycleYear) return true;
  if (member.ums_is_new === 1 || member.ums_is_new === true) {
    if (!member.first_membership_cycle || member.first_membership_cycle >= cycleYear) {
      return true;
    }
  }
  if (member.u_is_new === 1 || member.u_is_new === true) {
    if (member.joined_date) {
      const joined = new Date(member.joined_date);
      const cycleStart = new Date(cycleYear, ENHANCED_MEMBERSHIP_CONFIG.CYCLE_START_MONTH, 1);
      if (joined >= cycleStart) return true;
    } else {
      return true;
    }
  }
  return false;
}

async function runReminders(now: Date, dryRun: boolean): Promise<CronResult> {
  const cycleYear = getCycleYearForDate(now);
  const result: CronResult = {
    date: now.toISOString(),
    cycleYear,
    dryRun,
    sent: { upcomingCycleReminders: 0, gracePeriodReminders: 0, penaltyWarnings: 0 },
    skipped: 0,
    errors: [],
  };

  const members = await fetchActiveMembers();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();

  // --- Window 1: Upcoming-cycle reminder ----------------------------------
  // Sent during January (any day) for the cycle that begins Feb 1 of the
  // current calendar year. We treat January of yearN as the lead-in for
  // cycleYear = yearN (where cycleYear is the start year of the Feb 1 cycle).
  const upcomingWindow = month === 0; // January
  const upcomingCycleYear = now.getFullYear(); // Feb-1-of-this-year cycle

  // --- Window 2: Grace period reminder ------------------------------------
  // Sent in the second half of March (Mar 15-31) for the active cycle.
  const graceWindow = month === 2 && day >= 15; // March 15+

  // --- Window 3: Penalty warning ------------------------------------------
  // Sent on/after April 1, once per calendar month per user.
  // Cycle is the active cycle (Feb 1 of this year through Jan 31 next year).
  const penaltyWindow =
    (month > 2) /* Apr..Dec */ ||
    (month === 2 && day >= 31) /* Mar 31 edge */;

  for (const m of members) {
    try {
      const category = resolveCategory(m.user_category, m.membership_type);
      const userName = m.name || m.email;
      const userId = m.user_id;

      if (upcomingWindow) {
        const alreadyPaid = await isCyclePaid(userId, upcomingCycleYear);
        if (alreadyPaid) {
          result.skipped++;
        } else {
          // Continuing member if first_membership_cycle is set and earlier than upcomingCycleYear
          const isContinuing =
            !!m.first_membership_cycle && m.first_membership_cycle < upcomingCycleYear;
          if (dryRun) {
            result.sent.upcomingCycleReminders++;
          } else {
            const ok = await sendUpcomingCycleReminder(
              userId,
              userName,
              upcomingCycleYear,
              category,
              isContinuing
            );
            if (ok) result.sent.upcomingCycleReminders++;
          }
        }
      }

      if (graceWindow) {
        const alreadyPaid = await isCyclePaid(userId, cycleYear);
        if (alreadyPaid) {
          result.skipped++;
        } else if (isNewForCycle(m, cycleYear)) {
          // New members are still inside the same grace window but we keep
          // the reminder gentle (no penalty mention is fine).
          if (await hasNotificationBeenSent(userId, cycleYear, 'grace_period_reminder')) {
            result.skipped++;
          } else {
            const { baseAmount } = getMembershipFee({ category, isFirstYear: true, isNewUser: true });
            if (dryRun) {
              result.sent.gracePeriodReminders++;
            } else {
              const ok = await sendGracePeriodReminder(userId, userName, cycleYear, baseAmount);
              if (ok) result.sent.gracePeriodReminders++;
            }
          }
        } else {
          const { baseAmount } = getMembershipFee({ category, isFirstYear: false, isNewUser: false });
          if (dryRun) {
            result.sent.gracePeriodReminders++;
          } else {
            const ok = await sendGracePeriodReminder(userId, userName, cycleYear, baseAmount);
            if (ok) result.sent.gracePeriodReminders++;
          }
        }
      }

      if (penaltyWindow) {
        if (isNewForCycle(m, cycleYear)) {
          result.skipped++;
          continue;
        }
        const alreadyPaid = await isCyclePaid(userId, cycleYear);
        if (alreadyPaid) {
          result.skipped++;
          continue;
        }
        if (await penaltyWarningSentThisMonth(userId, cycleYear, now)) {
          result.skipped++;
          continue;
        }
        const { baseAmount } = getMembershipFee({ category, isFirstYear: false, isNewUser: false });
        const { penaltyAmount, totalDue } = calculateEnhancedPenalties({
          baseAmount,
          cycleYear,
          now,
          isNewUser: false,
          category,
        });
        const totalAmount = totalDue;
        if (penaltyAmount <= 0) {
          result.skipped++;
          continue;
        }
        if (dryRun) {
          result.sent.penaltyWarnings++;
        } else {
          const ok = await sendPenaltyWarning(
            userId,
            userName,
            cycleYear,
            baseAmount,
            penaltyAmount,
            totalAmount
          );
          if (ok) result.sent.penaltyWarnings++;
        }
      }
    } catch (err) {
      result.errors.push(
        `user_id=${m.user_id}: ${(err as Error).message}`
      );
    }
  }

  return result;
}

async function handle(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.ok !== true) return auth.response;

  const url = new URL(request.url);
  const dateOverride = url.searchParams.get('date');
  const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true';

  let now: Date;
  if (dateOverride) {
    const parsed = new Date(dateOverride);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { success: false, message: `Invalid date override: ${dateOverride}` },
        { status: 400 }
      );
    }
    now = parsed;
  } else {
    now = new Date();
  }

  try {
    const result = await runReminders(now, dryRun);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[cron/membership-reminders] failed:', err);
    return NextResponse.json(
      { success: false, message: 'Cron run failed', details: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
