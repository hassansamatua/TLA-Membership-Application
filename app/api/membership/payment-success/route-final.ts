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

    // Find or create payment record
    const [paymentRows] = await connection.query(
      'SELECT * FROM membership_payments WHERE payment_reference = ? AND user_id = ?',
      [paymentReference, decoded.id]
    ) as any[];

    if (!paymentRows.length) {
      // Create new payment record if not found
      await connection.query(
        'INSERT INTO membership_payments (user_id, amount, payment_method, reference, payment_date, status, cycle_year, created_at) VALUES (?, ?, ?, ?, NOW(), ?, ?, NOW())',
        [decoded.id, 40000, 'test', paymentReference, 'completed', 2025, 'test']
      );
    }

    // Update membership record
    await connection.query(
      'UPDATE memberships SET payment_status = ?, status = ?, payment_date = NOW(), amount_paid = ?, payment_reference = ? WHERE user_id = ?',
      ['paid', 'active', 40000, paymentReference, decoded.id]
    );

    // Update user_profiles
    await connection.query(
      'UPDATE user_profiles SET updated_at = NOW() WHERE user_id = ?',
      [decoded.id]
    );

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
