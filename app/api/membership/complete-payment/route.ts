import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentReference, amount, paymentMethod } = body;

    if (!paymentReference || !amount) {
      return NextResponse.json({ success: false, message: 'Payment reference and amount are required' }, { status: 400 });
    }

    connection = await pool.getConnection();

    // Get current membership info
    const membershipRows = await connection.query(
      'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1',
      [decoded.id]
    );

    const membership = (membershipRows as any[])[0] || null;

    if (!membership) {
      return NextResponse.json({ success: false, message: 'No active membership found' }, { status: 404 });
    }

    // Start transaction
    await connection.beginTransaction();

    try {
      const now = new Date();
      const expiryDate = new Date(now.getFullYear() + 1, 0, 31); // Next year end
      const expiryDateStr = expiryDate.toISOString().slice(0, 10);

      // 1. Update membership record
      await connection.query(
        `UPDATE memberships 
         SET payment_status = 'paid', 
             payment_date = NOW(), 
             amount_paid = ?, 
             payment_reference = ?,
             payment_method = ?,
             status = 'active',
             expiry_date = ?,
             updated_at = NOW()
         WHERE user_id = ?`,
        [amount, paymentReference, paymentMethod, expiryDateStr, decoded.id]
      );

      // 2. Create payment record in membership_payments
      await connection.query(
        `INSERT INTO membership_payments 
         (user_id, amount, payment_method, payment_reference, 
          payment_date, status, cycle_year, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), 'completed', ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           status = 'completed',
           updated_at = NOW()`,
        [
          decoded.id,
          amount,
          paymentMethod || 'unknown',
          paymentReference,
          now.getFullYear()
        ]
      );

      // 3. Update user_profiles with payment info
      await connection.query(
        'UPDATE user_profiles SET updated_at = NOW() WHERE user_id = ?',
        [decoded.id]
      );

      // Commit transaction
      await connection.commit();

      // 4. Get updated membership details
      const [updatedMembership] = await connection.query(
        'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1',
        [decoded.id]
      ) as any[];

      return NextResponse.json({
        success: true,
        message: 'Payment completed successfully',
        data: {
          membershipNumber: updatedMembership?.[0]?.membership_number || membership.membership_number,
          paymentReference,
          amountPaid: amount,
          paymentDate: now.toISOString(),
          canAccessIdCard: true // User can now access membership card
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error; // Will be caught by the outer catch block
    }

  } catch (error) {
    console.error('Error completing payment:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
