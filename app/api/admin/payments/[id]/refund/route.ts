import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { ResultSetHeader } from 'mysql2/promise';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(
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

    // Check if payment exists and is not already refunded
    const [existingPayments] = await connection.query(
      'SELECT id, status FROM payments WHERE id = ?',
      [paymentId]
    );

    if ((existingPayments as any[]).length === 0) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      );
    }

    const existingPayment = (existingPayments as any[])[0];
    if (existingPayment.status === 'refunded') {
      return NextResponse.json(
        { message: 'Payment is already refunded' },
        { status: 400 }
      );
    }

    // Update payment status to refunded
    const [result] = await connection.query<ResultSetHeader>(
      'UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?',
      ['refunded', paymentId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: 'Failed to refund payment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Payment refunded successfully',
      paymentId: parseInt(paymentId)
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    return NextResponse.json(
      { message: 'Failed to refund payment' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
