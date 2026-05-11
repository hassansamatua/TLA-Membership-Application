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

    // Find the payment record
    const [paymentRows] = await connection.query(
      'SELECT * FROM membership_payments WHERE payment_reference = ? AND user_id = ?',
      [paymentReference, decoded.id]
    ) as any[];

    if (!paymentRows.length) {
      return NextResponse.json({ success: false, message: 'Payment not found' }, { status: 404 });
    }

    const payment = paymentRows[0];

    // Update payment status to completed
    await connection.query(
      'UPDATE membership_payments SET status = ?, updated_at = NOW() WHERE id = ?',
      ['completed', payment.id]
    );

    // Update membership status to active and paid
    await connection.query(
      'UPDATE memberships SET payment_status = ?, payment_date = NOW(), status = ?, amount_paid = ?, payment_reference = ? WHERE user_id = ?',
      ['paid', 'active', payment.amount, paymentReference, decoded.id]
    );

    // Update user_profiles with latest info
    await connection.query(
      'UPDATE user_profiles SET updated_at = NOW() WHERE user_id = ?',
      [decoded.id]
    );

    // Get updated membership details for response
    const [updatedMembershipRows] = await connection.query(
      'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1',
      [decoded.id]
    ) as any[];

    const updatedMembership = updatedMembershipRows[0];

    return NextResponse.json({
      success: true,
      message: 'Payment successful! Your membership has been activated.',
      data: {
        payment: {
          reference: paymentReference,
          amount: payment.amount,
          method: payment.payment_method,
          date: payment.payment_date,
          status: 'completed'
        },
        membership: {
          membershipNumber: updatedMembership.membership_number,
          membershipType: updatedMembership.membership_type,
          status: 'active',
          paymentStatus: 'paid',
          joinedDate: updatedMembership.joined_date,
          expiryDate: updatedMembership.expiry_date,
          amountPaid: updatedMembership.amount_paid
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
