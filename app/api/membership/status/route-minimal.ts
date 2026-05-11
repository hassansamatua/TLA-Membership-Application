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

export async function GET(request: Request) {
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

    connection = await pool.getConnection();

    // Simple queries without complex logic
    const [paymentRows] = await connection.query(
      'SELECT * FROM membership_payments WHERE user_id = ? AND status = "completed" ORDER BY payment_date DESC LIMIT 1',
      [decoded.id]
    ) as any[];

    const [membershipRows] = await connection.query(
      'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1',
      [decoded.id]
    ) as any[];

    const hasCompletedPayment = paymentRows.length > 0;
    const membership = membershipRows[0] || null;
    const membershipActive = membership && membership.status === 'active' && membership.payment_status === 'paid';

    const canAccessIdCard = hasCompletedPayment && membershipActive;

    return NextResponse.json({
      success: true,
      canAccessIdCard,
      membership: membership ? {
        membershipNumber: membership.membership_number,
        membershipType: membership.membership_type,
        status: membership.status,
        paymentStatus: membership.payment_status
      } : null
    });
  } catch (error) {
    console.error('Error in GET /api/membership/status:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
