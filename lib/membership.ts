// lib/membership.ts
import { pool } from './db';
import type { RowDataPacket } from 'mysql2';
import { getCycleYearForDate } from './membershipCycles';
import {
  getCycleExpiryDateString,
  recordCycleAndUserStatus,
  toMySqlDate,
} from './enhancedMembershipCycles';

export async function generateMembershipNumber(): Promise<string> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get or create sequence for current year
    const year = new Date().getFullYear().toString().slice(-2);
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT last_number FROM membership_sequence WHERE year = ? FOR UPDATE',
      [year]
    ) as [RowDataPacket[], any];

    let nextNumber: number;
    
    if (rows.length === 0) {
      // First number for this year
      nextNumber = 1;
      await connection.query(
        'INSERT INTO membership_sequence (year, last_number) VALUES (?, ?)',
        [year, nextNumber]
      );
    } else {
      // Increment last number
      nextNumber = rows[0].last_number + 1;
      await connection.query(
        'UPDATE membership_sequence SET last_number = ? WHERE year = ?',
        [nextNumber, year]
      );
    }

    await connection.commit();
    
    // Format as TLAyyXXXXX (5 digits minimum)
    return `TLA${year}${nextNumber.toString().padStart(5, '0')}`;

  } catch (error) {
    await connection.rollback();
    console.error('Error generating membership number:', error);
    const err = new Error('Failed to generate membership number');
    (err as any).cause = error;
    throw err;
  } finally {
    connection.release();
  }
}

export async function updateMembershipPayment(paymentData: {
  reference: string;
  transactionId?: string;
  amount: number;
  paymentMethod: string;
  status: 'completed' | 'failed' | 'pending';
  paidAt: Date;
}) {
  const connection = await pool.getConnection();
  
  try {
    // Update payments table
    await connection.query(
      `UPDATE payments SET 
       transaction_id = ?, 
       status = ?, 
       paid_at = ?, 
       payment_method = ?
       WHERE reference = ?`,
      [
        paymentData.transactionId,
        paymentData.status,
        paymentData.paidAt,
        paymentData.paymentMethod,
        paymentData.reference
      ]
    );

    // If payment is completed, update membership status
    if (paymentData.status === 'completed') {
      // Get payment details to find user
      const [paymentRows] = await connection.query<RowDataPacket[]>(
        'SELECT user_id, membership_type FROM payments WHERE reference = ?',
        [paymentData.reference]
      );

      if (paymentRows.length > 0) {
        const { user_id, membership_type } = paymentRows[0];

        // Re-read with cycle metadata persisted by the checkout route.
        const [meta] = await connection.query<RowDataPacket[]>(
          `SELECT target_cycle_year, cycle_count
             FROM payments WHERE reference = ?`,
          [paymentData.reference]
        );
        const targetCycleYear = (meta as any[])[0]?.target_cycle_year ?? null;
        const cycleCount = Math.min(
          3,
          Math.max(1, Number((meta as any[])[0]?.cycle_count) || 1)
        );

        // Check if membership already exists
        const [membershipRows] = await connection.query<RowDataPacket[]>(
          'SELECT id, membership_number FROM memberships WHERE user_id = ?',
          [user_id]
        );

        let membershipNumber = membershipRows[0]?.membership_number;
        
        // Canonical cycle math: derive cycle from payment timestamp and pin
        // expiry to Jan 31 of cycle+1 (no more `CURDATE() + 1 year`).
        const paymentDate = paymentData.paidAt || new Date();
        const baseCycleYear = targetCycleYear ?? getCycleYearForDate(paymentDate);
        const lastCycleYear = baseCycleYear + cycleCount - 1;
        const cycleYear = baseCycleYear; // backwards-compat alias
        // Expiry is Jan 31 of the LAST cycle + 1, so prepaying multiple
        // years extends the card to the right date in one step.
        const expiryDateString = getCycleExpiryDateString(lastCycleYear);
        const paymentDateString = toMySqlDate(paymentDate);

        if (membershipRows.length > 0) {
          // Membership exists, just update payment info (don't touch membership_number)
          await connection.query(
            `UPDATE memberships SET 
             membership_type = ?,
             status = 'active',
             payment_status = 'paid',
             payment_date = ?,
             amount_paid = ?,
             expiry_date = CASE
               WHEN expiry_date IS NULL OR expiry_date < ? THEN ?
               ELSE expiry_date
             END,
             updated_at = NOW()
             WHERE user_id = ?`,
            [membership_type, paymentDateString, paymentData.amount, expiryDateString, expiryDateString, user_id]
          );
        } else {
          // No membership exists, create new one
          if (!membershipNumber) {
            membershipNumber = await generateMembershipNumber();
          }
          
          await connection.query(
            `INSERT INTO memberships 
             (user_id, membership_number, membership_type, status, payment_status, payment_date, amount_paid, created_at, expiry_date, joined_date)
             VALUES (?, ?, ?, 'active', 'paid', ?, ?, NOW(), ?, ?)`,
            [user_id, membershipNumber, membership_type, paymentDateString, paymentData.amount, expiryDateString, paymentDateString]
          );
        }

        // Create payment record in membership_payments table (cycle-aware)
        const perCycleAmount = Math.round(paymentData.amount / cycleCount);
        for (let cy = baseCycleYear; cy <= lastCycleYear; cy++) {
          await connection.query(
            `INSERT INTO membership_payments 
             (user_id, amount, payment_method, reference, 
              payment_date, status, cycle_year)
             VALUES (?, ?, ?, ?, ?, 'completed', ?)
             ON DUPLICATE KEY UPDATE
               status = 'completed',
               updated_at = NOW()`,
            [
              user_id, perCycleAmount, paymentData.paymentMethod,
              `${paymentData.reference}-${cy}`, paymentDateString, cy,
            ]
          );

          await recordCycleAndUserStatus({
            connection,
            userId: user_id,
            cycleYear: cy,
            baseAmount: perCycleAmount,
            penaltyAmount: 0,
            paymentReference: paymentData.reference,
            paymentDate,
          });
        }
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error updating membership payment:', error);
    throw error;
  } finally {
    connection.release();
  }
}