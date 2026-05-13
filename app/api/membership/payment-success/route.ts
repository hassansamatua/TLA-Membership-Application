import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { generateMembershipNumber } from '@/lib/membership';
import { getCycleYearForDate } from '@/lib/membershipCycles';
import {
  getCycleExpiryDateString,
  recordCycleAndUserStatus,
  isUserNew,
  getMembershipFee,
  calculateEnhancedPenalties,
  toMySqlDate,
} from '@/lib/enhancedMembershipCycles';

async function getAuthToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
  console.log('=== PAYMENT SUCCESS API START ===');
  console.log('Payment success API called');

  let connection;
  try {
    const token = await getAuthToken(request);
    console.log('Token found:', !!token);
    
    if (!token) {
      console.log('No token found, returning 401');
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    console.log('Token decoded:', decoded);
    
    if (!decoded?.id) {
      console.log('Invalid token, returning 401');
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    console.log('User ID from token:', decoded.id);

    const body = await request.json();
    const { paymentReference } = body;

    console.log('Payment reference from body:', paymentReference);

    if (!paymentReference) {
      console.log('No payment reference found, returning 400');
      return NextResponse.json({ success: false, message: 'Payment reference is required' }, { status: 400 });
    }

    console.log('Getting database connection...');
    connection = await pool.getConnection();
    console.log('Database connection established');
    
    // Test database connection
    try {
      const [testResult] = await connection.query('SELECT 1 as test_value');
      console.log('Database connection test result:', testResult);
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
    }

    // Find the payment record - using LIKE to handle potential URL-encoded characters
    console.log('=== PAYMENT SEARCH DEBUG ===');
    console.log('Searching for payment with reference:', paymentReference);
    console.log('User ID from token:', decoded.id);
    console.log('Payment reference type:', typeof paymentReference);
    console.log('Payment reference length:', paymentReference.length);
    
    // First, let's check if payments table exists and has data
    try {
      const [tableCheck] = await connection.query('SHOW TABLES LIKE "payments"');
      console.log('Payments table exists:', tableCheck.length > 0);
      
      if (tableCheck.length > 0) {
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM payments');
        console.log('Total payments in database:', countResult[0].total);
        
        const [userPayments] = await connection.query('SELECT COUNT(*) as user_total FROM payments WHERE user_id = ?', [decoded.id]);
        console.log('Payments for this user:', userPayments[0].user_total);
      }
    } catch (tableError) {
      console.error('Error checking payments table:', tableError);
    }
    
    const [paymentRows] = await connection.query(
      `SELECT * FROM payments
        WHERE user_id = ?
          AND (reference = ? OR transaction_id = ?)
        ORDER BY id DESC
        LIMIT 1`,
      [decoded.id, paymentReference, paymentReference]
    ) as any[];

    console.log('Payment query result:', {
      rowCount: paymentRows.length,
      rows: paymentRows
    });
    
    // If no exact match, try a broader search
    if (paymentRows.length === 0) {
      console.log('No exact match found, trying broader search...');
      const [broadRows] = await connection.query(
        'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
        [decoded.id]
      ) as any[];
      console.log('Recent payments for this user:', broadRows);
    }

    if (!paymentRows.length) {
      console.error('Payment not found with reference:', paymentReference);
      console.error('Available payments for this user:');
      // Debug: Show all payments for this user
      const [allPayments] = await connection.query(
        'SELECT reference, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
        [decoded.id]
      ) as any[];
      console.log('All user payments:', allPayments);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Payment not found',
          details: `No payment found with reference: ${paymentReference} for user: ${decoded.id}. Available payments: ${JSON.stringify(allPayments, null, 2)}`
        },
        { status: 400 }
      );
    }

    // Start transaction to ensure data consistency
    await connection.beginTransaction();
    console.log('Transaction started for payment processing');

    try {
      const payment = paymentRows[0];
      const paymentId = payment?.id;
      if (!paymentId) {
        throw new Error('Payment record not found');
      }

      const paymentAmount = Number(payment.amount) || 0;
      const membershipType: 'personal' | 'organization' =
        payment.membership_type === 'organization' ? 'organization' : 'personal';
      const dbMembershipType: 'personal' | 'organization' = membershipType;

      // Canonical cycle math: derive cycle from the payment date, then compute
      // the corresponding Jan-31 expiry. This replaces the old
      // `CURDATE() + 1 YEAR` heuristic.
      const paymentDate: Date = payment.paid_at
        ? new Date(payment.paid_at)
        : payment.created_at
        ? new Date(payment.created_at)
        : new Date();
      // Multi-cycle support: when the checkout route stamped
      // `target_cycle_year` + `cycle_count`, we mark every cycle in
      // [target .. target+count-1] as paid and extend expiry to Jan 31
      // of (last cycle + 1). Falls back cleanly to single-cycle behaviour
      // when the columns are NULL (legacy payments).
      const targetCycleYearStored = (payment as any).target_cycle_year ?? null;
      const cycleCount = Math.min(
        3,
        Math.max(1, Number((payment as any).cycle_count) || 1)
      );
      const baseCycleYear =
        targetCycleYearStored != null
          ? Number(targetCycleYearStored)
          : getCycleYearForDate(paymentDate);
      const lastCycleYear = baseCycleYear + cycleCount - 1;
      const cycleYear = baseCycleYear; // backwards-compat alias for code below
      const expiryDateString = getCycleExpiryDateString(lastCycleYear);
      const joinedDateString = toMySqlDate(paymentDate);

      // 1. Update payment status to completed (idempotent), and stamp cycle_year
      //    if the column exists and is currently NULL.
      await connection.query(
        `UPDATE payments
         SET status = 'completed',
             paid_at = COALESCE(paid_at, NOW()),
             cycle_year = COALESCE(cycle_year, ?),
             updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [cycleYear, paymentId, decoded.id]
      );

      // 2. Resolve / generate membership number
      const [existingRows] = await connection.query(
        'SELECT membership_number FROM memberships WHERE user_id = ?',
        [decoded.id]
      ) as any[];
      let membershipNumber: string | null = existingRows?.[0]?.membership_number || null;
      if (!membershipNumber) {
        const [profileRows] = await connection.query(
          'SELECT membership_number FROM user_profiles WHERE user_id = ?',
          [decoded.id]
        ) as any[];
        membershipNumber = profileRows?.[0]?.membership_number || null;
      }
      if (!membershipNumber) {
        membershipNumber = await generateMembershipNumber();
      }

      // 3. Upsert membership record (relies on UNIQUE KEY on memberships.user_id).
      //    Expiry is always pinned to Jan 31 of the cycle's end year.
      await connection.query(
        `INSERT INTO memberships
           (user_id, membership_number, membership_type, status, joined_date,
            expiry_date, payment_status, payment_date, amount_paid,
            payment_method, reference, payment_reference,
            created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?,
                 ?, 'paid', ?, ?,
                 ?, ?, ?,
                 NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           membership_number = COALESCE(memberships.membership_number, VALUES(membership_number)),
           membership_type   = VALUES(membership_type),
           status            = 'active',
           payment_status    = 'paid',
           payment_date      = VALUES(payment_date),
           expiry_date       = CASE
             WHEN expiry_date IS NULL OR expiry_date < VALUES(expiry_date)
               THEN VALUES(expiry_date)
             ELSE expiry_date
           END,
           amount_paid       = VALUES(amount_paid),
           payment_method    = VALUES(payment_method),
           reference         = VALUES(reference),
           payment_reference = VALUES(payment_reference),
           updated_at        = NOW()`,
        [
          decoded.id,
          membershipNumber,
          dbMembershipType,
          joinedDateString,
          expiryDateString,
          joinedDateString,
          paymentAmount,
          payment.payment_method || null,
          payment.reference || null,
          payment.reference || null,
        ]
      );

      // 4. Mirror payment into cycle_payment_status / user_membership_status so
      //    `/api/membership/status` always reflects the latest cycle. When
      //    the user prepaid multiple cycles, mark each one in the range as
      //    paid (only the first/current cycle carries any penalty).
      let baseAmountForCycle = Math.round(paymentAmount / cycleCount);
      let penaltyForCycle = 0;
      let userCategoryResolved: 'librarian' | 'organization' | 'regular' = 'regular';
      try {
        const wasNew = await isUserNew(decoded.id);
        userCategoryResolved =
          membershipType === 'organization' ? 'organization' : 'regular';
        const { baseAmount } = getMembershipFee({
          category: userCategoryResolved,
          isFirstYear: wasNew,
          isNewUser: wasNew,
        });
        const { penaltyAmount } = calculateEnhancedPenalties({
          baseAmount,
          cycleYear: baseCycleYear,
          now: paymentDate,
          isNewUser: wasNew,
          category: userCategoryResolved,
        });
        baseAmountForCycle = baseAmount;
        penaltyForCycle = penaltyAmount;
      } catch {
        // Fall back to recording the full paid amount as base if fee schedule
        // resolution fails (legacy DBs without user_category).
      }
      for (let cy = baseCycleYear; cy <= lastCycleYear; cy++) {
        await recordCycleAndUserStatus({
          connection,
          userId: decoded.id,
          cycleYear: cy,
          baseAmount: baseAmountForCycle,
          // Only the first (current) cycle bears the penalty; future
          // cycles being prepaid are not late, so no penalty applies.
          penaltyAmount: cy === baseCycleYear ? penaltyForCycle : 0,
          paymentReference: payment.reference || null,
          paymentDate,
        });
      }

      // Commit transaction
      await connection.commit();

      // Update user_profiles (best-effort)
      try {
        await connection.query(
          `UPDATE user_profiles
             SET membership_number = COALESCE(membership_number, ?),
                 membership_status = 'active',
                 join_date = COALESCE(join_date, ?),
                 updated_at = NOW()
           WHERE user_id = ?`,
          [membershipNumber, joinedDateString, decoded.id]
        );
      } catch (profileError) {
        console.warn('Failed to update user_profiles:', profileError);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          membershipNumber,
          membershipType,
          amountPaid: paymentAmount,
          reference: payment.reference,
        },
      });

    } catch (error) {
      // Rollback in case of error
      await connection.rollback();
      console.error('Error in payment success transaction:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to process payment',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Payment success API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Always release connection
    if (connection) {
      connection.release();
    }
  }
}
