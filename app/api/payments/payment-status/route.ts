/**
 * Get membership payment status
 * Shows current cycle, payment status, grace period status, penalties
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import {
  getCycleYearForDate,
  isInGracePeriod,
  calculatePenalty,
  getMonthsSinceCycleStart,
} from '@/lib/membershipCycles';
import type { RowDataPacket } from 'mysql2';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const userId = decoded.id;

    const connection = await pool.getConnection();

    try {
      // Get user membership status
      const [statusRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM user_membership_status WHERE user_id = ?`,
        [userId]
      ) as [RowDataPacket[], any];

      if (statusRows.length === 0) {
        return NextResponse.json(
          {
            approved: false,
            message: 'User has not been approved for membership yet',
          },
          { status: 200 }
        );
      }

      const userStatus = statusRows[0];
      const currentCycleYear = getCycleYearForDate();
      const now = new Date();

      // Get all cycle payment statuses
      const [cycles] = await connection.query<RowDataPacket[]>(
        `SELECT cps.*, mc.base_fee, mc.grace_period_end, mc.penalty_start_date
         FROM cycle_payment_status cps
         JOIN membership_cycles mc ON cps.cycle_year = mc.cycle_year
         WHERE cps.user_id = ?
         ORDER BY cps.cycle_year DESC`,
        [userId]
      ) as [RowDataPacket[], any];

      // Get latest membership record
      const [membershipRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM memberships WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ) as [RowDataPacket[], any];

      const membership = membershipRows[0];

      // Process cycle information
      const cycleInfo = cycles.map((cycle: any) => {
        const inGracePeriod = isInGracePeriod(now, cycle.cycle_year);
        const monthsPassed = getMonthsSinceCycleStart(now, cycle.cycle_year);
        const penalty = !userStatus.is_new_member 
          ? calculatePenalty(now, cycle.cycle_year, true)
          : 0;

        return {
          cycleYear: cycle.cycle_year,
          isPaid: cycle.is_paid === 1 || cycle.is_paid === true,
          status: cycle.status,
          baseFee: cycle.base_fee,
          penalty,
          totalDue: cycle.base_fee + penalty,
          paymentDate: cycle.payment_date,
          inGracePeriod,
          monthsPassed,
          gracePeriodEnd: cycle.grace_period_end,
          penaltyStartDate: cycle.penalty_start_date,
        };
      });

      // Calculate summary
      const unpaidCycles = cycleInfo.filter(c => !c.isPaid);
      const totalDue = unpaidCycles.reduce((sum, c) => sum + c.totalDue, 0);
      const totalPenalty = unpaidCycles.reduce((sum, c) => sum + c.penalty, 0);

      // Determine current payment status
      let paymentStatus = 'paid';
      if (unpaidCycles.length > 0) {
        const currentCycleUnpaid = unpaidCycles.find(c => c.cycleYear === currentCycleYear);
        if (currentCycleUnpaid) {
          if (currentCycleUnpaid.inGracePeriod) {
            paymentStatus = 'grace_period';
          } else {
            paymentStatus = 'overdue';
          }
        } else {
          paymentStatus = 'pending'; // Past cycle unpaid
        }
      }

      return NextResponse.json({
        approved: true,
        isNewMember: userStatus.is_new_member === 1 || userStatus.is_new_member === true,
        firstMembershipCycle: userStatus.first_membership_cycle,
        currentStatus: userStatus.status,
        paymentStatus,
        
        membership: membership
          ? {
              membershipNumber: membership.membership_number,
              membershipType: membership.membership_type,
              status: membership.status,
              joinedDate: membership.joined_date,
              expiryDate: membership.expiry_date,
              lastPaymentDate: membership.payment_date,
            }
          : null,

        cycles: cycleInfo,

        summary: {
          unpaidCycleCount: unpaidCycles.length,
          totalDue,
          baseFeeTotal: totalDue - totalPenalty,
          totalPenalty,
          currentCycle: currentCycleYear,
          paymentDeadline: new Date(currentCycleYear, 3, 1).toISOString(), // Apr 1
        },

        notificationsSent: {
          approval: !!userStatus.last_payment_date || false, // Assume approval sent if user initialized
          graceperiodReminder: false, // Would be tracked in penalty_notifications table
          penaltyWarning: false, // Would be tracked in penalty_notifications table
        },
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
}
