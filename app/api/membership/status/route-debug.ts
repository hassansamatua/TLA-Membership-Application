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

    const url = new URL(request.url);
    const typeParam = url.searchParams.get('type');
    const newUserParam = url.searchParams.get('newUser');

    connection = await pool.getConnection();

    const [userRows] = await connection.query(
      'SELECT id, membership_type, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!userRows?.length) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const userTypeRaw = String((userRows[0] as any).membership_type || '').toLowerCase();
    const defaultType: 'personal' | 'organization' = userTypeRaw === 'organization' ? 'organization' : 'personal';

    const type: 'personal' | 'organization' = typeParam === 'organization' ? 'organization' : 'personal';
    const now = new Date();
    
    // Get user registration date for new user grace period calculation
    const registrationDate = new Date((userRows[0] as any).created_at);

    const [membershipRows] = await connection.query(
      'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1',
      [decoded.id]
    );

    const membership = membershipRows?.[0] || null;
    const hasMembership = !!membership;

    // Check for completed payment in membership_payments table
    const [paymentRows] = await connection.query(
      'SELECT * FROM membership_payments WHERE user_id = ? AND status = \'completed\' ORDER BY payment_date DESC LIMIT 1',
      [decoded.id]
    ) as any[];

    const completedPayment = paymentRows?.[0] || null;
    const hasCompletedPayment = !!completedPayment;

    const newUser = newUserParam != null
      ? newUserParam === 'true' || newUserParam === '1'
      : !hasMembership;

    const planType = typeParam === 'personal' || typeParam === 'organization' ? type : defaultType;
    const baseAmount = planType === 'organization' ? 150000 : (newUser ? 40000 : 30000);

    // Simple active status check
    const membershipExpiry = membership?.expiry_date ? new Date(membership.expiry_date) : null;
    const activeByDate = membershipExpiry ? membershipExpiry.getTime() >= now.getTime() : false;
    const paid = membership?.payment_status === 'paid';
    
    // Active status depends on completed payment and membership existence
    const active = Boolean(
      membership && 
      membership.status === 'active' && 
      activeByDate && 
      hasCompletedPayment
    );

    const effectiveFees = active
      ? { baseAmount: 0, penaltyAmount: 0, totalDue: 0, currency: 'TZS' }
      : { baseAmount, penaltyAmount: 0, totalDue: baseAmount, currency: 'TZS' };

    return NextResponse.json({
      success: true,
      cycle: {
        year: now.getFullYear(),
        startDate: now.toISOString().slice(0, 10),
        dueDate: now.toISOString().slice(0, 10),
        expiryDate: now.toISOString().slice(0, 10)
      },
      plan: {
        type: planType,
        newUser
      },
      fees: effectiveFees,
      membership: membership
        ? {
            membershipNumber: membership.membership_number,
            membershipType: membership.membership_type,
            status: membership.status,
            paymentStatus: membership.payment_status,
            joinedDate: membership.joined_date,
            expiryDate: membership.expiry_date,
            amountPaid: membership.amount_paid
          }
        : null,
      canAccessIdCard: active
    });
  } catch (error) {
    console.error('Error in GET /api/membership/status:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
