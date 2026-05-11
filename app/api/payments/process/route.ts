/**
 * Process membership payment with cycle system
 * Handles:
 * - Single cycle payments
 * - Multiple unpaid cycle payments
 * - Penalty calculations
 * - Payment confirmation and notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import {
  getCycleYearForDate,
  calculatePenalty,
  recordCyclePayment,
  getUnpaidCycles,
  calculateTotalAmountDue,
  markUserAsContinuous,
  updateUserMembershipStatus,
} from '@/lib/membershipCycles';
import { sendPaymentConfirmation } from '@/lib/notificationService';
import type { RowDataPacket } from 'mysql2';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const userId = decoded.id;

    const {
      paymentReference, // From payment gateway
      amount,
      paymentMethod,
      cycleYear, // Optional - specific cycle. If not provided, pay for current unpaid cycles
      paidAt = new Date(),
    } = await request.json();

    if (!paymentReference || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentReference, amount, paymentMethod' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Get user membership status
      const [statusRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM user_membership_status WHERE user_id = ?`,
        [userId]
      ) as [RowDataPacket[], any];

      if (statusRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'User has not been approved for membership' },
          { status: 400 }
        );
      }

      const userStatus = statusRows[0];
      const isNewUser = userStatus.is_new_member;
      const targetCycleYear = cycleYear || getCycleYearForDate(paidAt);

      // 2. Get unpaid cycles for this user
      const [unpaidCycles] = await connection.query<RowDataPacket[]>(
        `SELECT cps.*, mc.base_fee 
         FROM cycle_payment_status cps
         JOIN membership_cycles mc ON cps.cycle_year = mc.cycle_year
         WHERE cps.user_id = ? AND cps.is_paid = FALSE
         ORDER BY cps.cycle_year ASC`,
        [userId]
      ) as [RowDataPacket[], any];

      let totalDue = 0;
      let penaltyApplied = 0;
      let paidCycles: number[] = [];

      // 3. Calculate payment for each unpaid cycle
      for (const cycleRecord of unpaidCycles) {
        const cycleYear = cycleRecord.cycle_year;
        const baseFee = cycleRecord.base_fee;

        // Calculate penalty for this cycle
        let cyclePenalty = 0;
        
        // New users don't pay penalties for their joining cycle
        if (!isNewUser || cycleYear !== userStatus.first_membership_cycle) {
          cyclePenalty = calculatePenalty(paidAt, cycleYear, !isNewUser);
        }

        const cycleTotal = baseFee + cyclePenalty;
        totalDue += cycleTotal;
        penaltyApplied += cyclePenalty;
        paidCycles.push(cycleYear);

        // Record the payment for this cycle
        await connection.query(
          `UPDATE cycle_payment_status 
           SET is_paid = TRUE,
               payment_date = ?,
               amount_paid = ?,
               penalty_amount = ?,
               total_amount = ?,
               payment_reference = ?,
               status = 'paid',
               updated_at = NOW()
           WHERE user_id = ? AND cycle_year = ?`,
          [paidAt, baseFee, cyclePenalty, cycleTotal, paymentReference, userId, cycleYear]
        );
      }

      // 4. Create payment record
      await connection.query(
        `INSERT INTO payments 
         (user_id, reference, membership_type, amount, currency, status, payment_method, 
          transaction_id, paid_at, cycle_year, penalty_amount, created_at)
         VALUES (?, ?, 'membership', ?, 'TZS', 'completed', ?, ?, ?, ?, ?, NOW())`,
        [userId, paymentReference, totalDue, paymentMethod, paymentReference, targetCycleYear, penaltyApplied]
      );

      // 5. Update membership record
      const [membershipRows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM memberships WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ) as [RowDataPacket[], any];

      if (membershipRows.length > 0) {
        const expiryDate = new Date(targetCycleYear + 1, 0, 31); // Jan 31 of next year
        await connection.query(
          `UPDATE memberships 
           SET status = 'active',
               payment_status = 'paid',
               payment_date = NOW(),
               amount_paid = ?,
               reference = ?,
               cycle_year = ?,
               expiry_date = ?,
               updated_at = NOW()
           WHERE user_id = ?`,
          [totalDue, paymentReference, targetCycleYear, expiryDate, userId]
        );
      }

      // 6. Create membership_payments record (for backward compatibility)
      await connection.query(
        `INSERT INTO membership_payments 
         (user_id, amount, payment_method, reference, payment_date, status, cycle_year)
         VALUES (?, ?, ?, ?, NOW(), 'completed', ?)
         ON DUPLICATE KEY UPDATE
           status = 'completed',
           updated_at = NOW()`,
        [userId, totalDue, paymentMethod, paymentReference, targetCycleYear]
      );

      // 7. Update user membership status
      await connection.query(
        `UPDATE user_membership_status 
         SET payment_status = 'paid',
             last_payment_date = NOW(),
             current_cycle_year = ?,
             status = 'active',
             updated_at = NOW()
         WHERE user_id = ?`,
        [targetCycleYear + 1, userId]
      );

      // If this was their first payment, mark them as continuous
      if (isNewUser && paidCycles.includes(userStatus.first_membership_cycle)) {
        await connection.query(
          `UPDATE user_membership_status 
           SET is_new_member = FALSE
           WHERE user_id = ?`,
          [userId]
        );
      }

      await connection.commit();

      // 8. Send payment confirmation (outside transaction)
      try {
        const [userRows] = await connection.query<RowDataPacket[]>(
          `SELECT name FROM users WHERE id = ?`,
          [userId]
        ) as [RowDataPacket[], any];
        
        if (userRows.length > 0) {
          await sendPaymentConfirmation(
            userId,
            userRows[0].name,
            paymentReference,
            totalDue,
            targetCycleYear
          );
        }
      } catch (notifyError) {
        console.error('Error sending payment confirmation:', notifyError);
        // Don't fail if notification fails
      }

      return NextResponse.json({
        success: true,
        payment: {
          reference: paymentReference,
          amount: totalDue,
          penalty: penaltyApplied,
          baseFee: totalDue - penaltyApplied,
          cyclesPaid: paidCycles,
          paymentDate: paidAt,
        },
        message: `Payment successful! Paid ${paidCycles.length} cycle(s) with ${penaltyApplied > 0 ? `penalty of ${penaltyApplied} TZS` : 'no penalties'}`,
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

/**
 * Get payment information for user
 * Shows current amount due, penalties, unpaid cycles
 */
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
      // Get user status
      const [statusRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM user_membership_status WHERE user_id = ?`,
        [userId]
      ) as [RowDataPacket[], any];

      if (statusRows.length === 0) {
        return NextResponse.json(
          { error: 'User has not been approved for membership' },
          { status: 400 }
        );
      }

      const userStatus = statusRows[0];

      // Get unpaid cycles with details
      const [cycles] = await connection.query<RowDataPacket[]>(
        `SELECT cps.*, mc.base_fee, mc.grace_period_end
         FROM cycle_payment_status cps
         JOIN membership_cycles mc ON cps.cycle_year = mc.cycle_year
         WHERE cps.user_id = ? AND cps.is_paid = FALSE
         ORDER BY cps.cycle_year ASC`,
        [userId]
      ) as [RowDataPacket[], any];

      // Calculate totals
      let totalDue = 0;
      let totalPenalty = 0;
      const cycleDetails = cycles.map((cycle: any) => {
        const penalty = calculatePenalty(
          new Date(),
          cycle.cycle_year,
          !userStatus.is_new_member
        );
        const total = cycle.base_fee + penalty;
        totalDue += total;
        totalPenalty += penalty;
        return {
          cycleYear: cycle.cycle_year,
          baseFee: cycle.base_fee,
          penalty,
          total,
          gracePeriodEnd: cycle.grace_period_end,
        };
      });

      return NextResponse.json({
        userStatus,
        cycles: cycleDetails,
        summary: {
          totalDue,
          totalPenalty,
          baseFeeTotal: totalDue - totalPenalty,
          unpaidCycleCount: cycles.length,
        },
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment information' },
      { status: 500 }
    );
  }
}
