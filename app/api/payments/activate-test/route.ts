import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCycleYearForDate } from '@/lib/membershipCycles';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2';

interface PaymentRow extends RowDataPacket {
  id: number;
  user_id: number;
  amount: number;
  membership_type: string;
  payment_method: string;
  reference: string;
}

async function getAuthToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
  let connection;
  
  try {
    console.log('[Activate-Test] Request received');
    
    const { reference } = await request.json();
    console.log('[Activate-Test] Reference extracted:', reference);
    
    if (!reference) {
      console.log('[Activate-Test] No reference provided');
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    // Get the authenticated user from the session
    const token = await getAuthToken(request);
    console.log('[Activate-Test] Token retrieved:', !!token);
    
    if (!token) {
      console.log('[Activate-Test] No token found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the token and get user ID
    const decoded = verifyToken(token);
    console.log('[Activate-Test] Token decoded:', decoded?.id);
    
    if (!decoded?.id) {
      console.log('[Activate-Test] Invalid token - no ID');
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 });
    }

    const userId = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;
    console.log('[Activate-Test] User ID:', userId);
    
    // Get database connection
    console.log('[Activate-Test] Getting database connection...');
    connection = await pool.getConnection();
    console.log('[Activate-Test] Database connection established');
    
    // Start transaction
    await connection.beginTransaction();
    console.log('[Activate-Test] Transaction started');
    
    try {
      // 1. Get payment details first
      const [paymentRows] = await connection.query<PaymentRow[]>(
        `SELECT id, user_id, amount, membership_type, payment_method, reference 
         FROM payments 
         WHERE reference = ? AND user_id = ? 
         LIMIT 1`,
        [reference, userId]
      );
      
      if (!paymentRows || paymentRows.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { success: false, error: 'Payment not found' },
          { status: 404 }
        );
      }
      
      const payment = paymentRows[0];
      
      // 2. Generate membership number and get current year
      const cycleYear = getCycleYearForDate(new Date()); // Use membership cycle year (2025 until Feb 1, 2026)
      const year = cycleYear.toString().slice(-2);
      const membershipNumber = `TLA${year}${Math.floor(10000 + Math.random() * 90000)}`;
      
      // Calculate expiry year based on membership cycle (Feb 1 - Jan 31)
      const now = new Date();
      const expiryYear = cycleYear + 1; // Expires at end of next calendar year
      
      console.log(' Membership cycle calculation:', {
        today: now.toISOString(),
        currentMonth: now.getMonth(),
        calendarYear: now.getFullYear(),
        cycleYear,
        expiryYear,
        expiryDate: `${expiryYear}-01-31`
      });
      
      // 3. First, create/update membership_payments record
      try {
        await connection.execute(
          `INSERT INTO membership_payments 
           (user_id, amount, payment_method, reference, 
            payment_date, status, cycle_year, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), 'completed', ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             status = 'completed',
             payment_date = NOW(),
             updated_at = NOW()`,
          [
            userId,
            payment.amount || 40000,
            payment.payment_method || 'test',
            payment.reference,
            cycleYear
          ]
        );
      } catch (error) {
        await connection.rollback();
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        throw new Error(`Failed to create/update membership_payments record: ${errorMessage}`);
      }
      
      // 4. Then, update the payments table to match the membership_payments status
      try {
        await connection.execute(
          `UPDATE payments p
           INNER JOIN membership_payments mp ON p.reference = mp.reference
           SET p.status = mp.status,
               p.paid_at = mp.payment_date,
               p.updated_at = NOW()
           WHERE p.id = ? AND p.user_id = ?`,
          [payment.id, userId]
        );
      } catch (error) {
        await connection.rollback();
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        throw new Error(`Failed to update payments table: ${errorMessage}`);
      }
      
      // 5. Finally, create or update the membership record
      try {
        await connection.execute(
          `INSERT INTO memberships 
           (user_id, membership_number, membership_type, status, 
            payment_status, payment_date, reference, payment_method,
            expiry_date, amount_paid, cycle_year, created_at, updated_at)
           VALUES (?, ?, ?, 'active', 'paid', NOW(), ?, ?, 
                  DATE(CONCAT(?, '-01-31')), ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             status = 'active',
             membership_type = VALUES(membership_type),
             payment_status = 'paid',
             payment_date = NOW(),
             reference = VALUES(reference),
             payment_method = VALUES(payment_method),
             expiry_date = VALUES(expiry_date),
             amount_paid = VALUES(amount_paid),
             cycle_year = VALUES(cycle_year),
             updated_at = NOW()`,
          [
            userId, 
            membershipNumber,
            payment.membership_type || 'personal',
            payment.reference,
            payment.payment_method || 'test',
            payment.amount || 40000,
            expiryYear,
            cycleYear
          ]
        );
      } catch (error) {
        await connection.rollback();
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        throw new Error(`Failed to create/update membership record: ${errorMessage}`);
      }
      
      // Commit the transaction
      await connection.commit();
      
      console.log(' Test payment activated successfully:', {
        reference,
        userId,
        membershipNumber,
        status: 'completed'
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Payment and membership updated successfully',
        data: {
          membershipNumber,
          reference: payment.reference,
          amount: payment.amount || 40000,
          paymentMethod: payment.payment_method || 'test',
          status: 'completed'
        }
      });
    } catch (error) {
      // Rollback in case of error
      if (connection) {
        await connection.rollback();
      }
      console.error('Error processing payment:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process payment',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in activate-test endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (err) {
        console.error('Error releasing connection:', err);
      }
    }
  }
}