// lib/membership.ts
import { pool } from './db';
import type { RowDataPacket } from 'mysql2';

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
        
        // Check if membership already exists
        const [membershipRows] = await connection.query<RowDataPacket[]>(
          'SELECT id, membership_number FROM memberships WHERE user_id = ?',
          [user_id]
        );

        let membershipNumber = membershipRows[0]?.membership_number;
        
        if (membershipRows.length > 0) {
          // Membership exists, just update payment info (don't touch membership_number)
          await connection.query(
            `UPDATE memberships SET 
             membership_type = ?,
             status = 'active',
             payment_status = 'paid',
             payment_date = CURDATE(),
             amount_paid = ?,
             expiry_date = DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
             updated_at = NOW()
             WHERE user_id = ?`,
            [membership_type, paymentData.amount, user_id]
          );
        } else {
          // No membership exists, create new one
          if (!membershipNumber) {
            membershipNumber = await generateMembershipNumber();
          }
          
          await connection.query(
            `INSERT INTO memberships 
             (user_id, membership_number, membership_type, status, payment_status, payment_date, amount_paid, created_at, expiry_date)
             VALUES (?, ?, ?, 'active', 'paid', CURDATE(), ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))`,
            [user_id, membershipNumber, membership_type, paymentData.amount]
          );
        }

        // Create payment record in membership_payments table
        const currentYear = new Date().getFullYear();
        await connection.query(
          `INSERT INTO membership_payments 
           (user_id, amount, payment_method, reference, 
            payment_date, status, cycle_year)
           VALUES (?, ?, ?, ?, NOW(), 'completed', ?)
           ON DUPLICATE KEY UPDATE
             status = 'completed',
             updated_at = NOW()`,
          [user_id, paymentData.amount, paymentData.paymentMethod, paymentData.reference, currentYear]
        );
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