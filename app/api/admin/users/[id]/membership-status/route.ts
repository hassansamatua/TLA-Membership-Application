import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2/promise';

type MembershipRow = RowDataPacket & {
  id: number;
  user_id: number;
  membership_number: string;
  membership_type: string;
  status: string;
  joined_date: string;
  expiry_date: string;
  payment_status: string;
  payment_date: string | null;
  amount_paid: string | number;
};

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const resolvedParams = await params;
    const userId = Number(resolvedParams.id);

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

    if (!token) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    connection = await pool.getConnection();

    const [memberships] = await connection.query<MembershipRow[]>(
      'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1',
      [userId]
    );

    const membership = memberships?.[0] || null;
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const expiryDate = membership?.expiry_date ? new Date(membership.expiry_date) : null;
    const expiryDateOnly = expiryDate
      ? new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate())
      : null;

    const activeByDate = expiryDateOnly ? expiryDateOnly.getTime() >= nowDateOnly.getTime() : false;
    const paid = membership?.payment_status === 'paid';
    const active = Boolean(membership?.status === 'active' && activeByDate && paid);

    return NextResponse.json({
      success: true,
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
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json(
        { success: false, message: 'Membership tables are not set up yet' },
        { status: 500 }
      );
    }

    console.error('Error in GET /api/admin/users/[id]/membership-status:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
