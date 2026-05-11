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
    const { paymentReference } = body;

    if (!paymentReference) {
      return NextResponse.json({ success: false, message: 'Payment reference is required' }, { status: 400 });
    }

    connection = await pool.getConnection();

    // Find the payment record - using LIKE to handle potential URL-encoded characters
    const [paymentRows] = await connection.query(
      'SELECT * FROM payments WHERE (reference = ? OR reference LIKE ?) AND user_id = ?',
      [paymentReference, `%${paymentReference}%`, decoded.id]
    ) as any[];

    if (!paymentRows.length) {
      return NextResponse.json(
        { success: false, message: 'Payment not found' },
        { status: 400 }
      );
    }

    // Start transaction to ensure data consistency
    await connection.beginTransaction();

    try {
      const paymentId = paymentRows[0]?.id;
      if (!paymentId) {
        throw new Error('Payment record not found');
      }

      // 1. Update payment status to completed
      const [updateResult] = await connection.query(
        `UPDATE payments 
         SET status = 'completed', 
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [paymentId, decoded.id]
      ) as any;

      // 2. Update or create membership record
      await connection.query(
        `INSERT INTO memberships 
         (user_id, status, payment_status, payment_date, expiry_date, created_at, updated_at)
         VALUES (?, 'active', 'paid', NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           status = 'active',
           payment_status = 'paid',
           payment_date = NOW(),
           expiry_date = DATE_ADD(NOW(), INTERVAL 1 YEAR),
           updated_at = NOW()`,
        [decoded.id]
      );

      // Commit the transaction
      await connection.commit();

      // Update user_profiles
      await connection.query(
        'UPDATE user_profiles SET updated_at = NOW() WHERE user_id = ?',
        [decoded.id]
      );

    } catch (error) {
      // Rollback in case of error
      await connection.rollback();
      console.error('Error in payment success:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to process payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment successful! Your membership has been activated.',
      data: {
        payment: {
          reference: paymentReference,
          amount: 40000,
          method: 'test',
          date: new Date().toISOString(),
          status: 'completed'
        },
        membership: {
          membershipNumber: 'TLA' + new Date().getFullYear().toString().slice(-2) + Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
          membershipType: 'personal',
          status: 'active',
          paymentStatus: 'paid',
          joinedDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(new Date().getFullYear(), 11, 30).toISOString().split('T')[0],
          amountPaid: 40000
        },
        contact: {
          email: 'membership@tla.or.tz',
          phone: '+255 22 211 3456'
        },
        actions: {
          viewMembershipCard: '/dashboard/membership-card',
          goToDashboard: '/dashboard'
        },
        canAccessIdCard: true
      }
    });
  } catch (error) {
    console.error('Error processing payment success:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
