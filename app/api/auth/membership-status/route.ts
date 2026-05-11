import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { 
  getMembershipStatus,
  isMembershipExpired,
  canViewMembershipId,
  getCurrentMembershipYear
} from '@/lib/membershipPayment';
import { RowDataPacket } from 'mysql2/promise';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (authToken) return authToken;

  try {
    const cookieStore = await cookies();
    return cookieStore.get('token')?.value || null;
  } catch {
    const cookieHeader = request.headers.get('cookie');
    return cookieHeader
      ? cookieHeader
          .split('; ')
          .find(c => c.trim().startsWith('token='))
          ?.split('=')[1] || null
      : null;
  }
}

// GET - Get current user's membership status
export async function GET(request: Request) {
  const connection = await pool.getConnection();

  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user information
    const [users] = await connection.query<RowDataPacket[]>(
      `SELECT u.*, up.* 
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    const joinDate = new Date(user.created_at || user.join_date || user.createdAt);

    // Get existing payments
    const [payments] = await connection.query<RowDataPacket[]>(
      `SELECT payment_year FROM membership_payments WHERE user_id = ?`,
      [decoded.id]
    );

    const paidYears = (payments as any[]).map(p => p.payment_year);

    // Get membership status
    const membershipStatus = getMembershipStatus(joinDate, paidYears);
    const isExpired = isMembershipExpired(joinDate, paidYears);
    const canViewId = canViewMembershipId(joinDate, paidYears);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        membershipType: user.membership_type,
        membershipNumber: canViewId ? user.membership_number : null, // Hide if expired
        membershipStatus: membershipStatus.status,
        canViewMembershipId: canViewId,
        isExpired: isExpired,
        statusMessage: membershipStatus.message
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/auth/membership-status:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
