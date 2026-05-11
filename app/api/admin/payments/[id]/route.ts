import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const resolvedParams = await params;
    const paymentId = resolvedParams.id;

    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    connection = await pool.getConnection();

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT 
        p.id,
        p.user_id as userId,
        u.name as userName,
        u.email as userEmail,
        p.membership_type as membershipType,
        p.amount,
        p.currency,
        p.status,
        p.payment_method as paymentMethod,
        p.transaction_id as transactionId,
        p.payment_date as paymentDate,
        p.due_date as dueDate,
        p.penalty_amount as penaltyAmount,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?`,
      [paymentId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { message: 'Failed to fetch payment' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
