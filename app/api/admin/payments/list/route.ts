import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2/promise';

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

// GET - Get all payments for admin
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
    if (!decoded?.id || !decoded.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const membershipType = searchParams.get('membershipType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query with filters
    let query = `
      SELECT 
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
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        p.paid_at as paymentDate,
        p.checkout_url as checkoutUrl,
        p.phone_number as phoneNumber
      FROM payments p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (membershipType) {
      query += ` AND p.membership_type = ?`;
      params.push(membershipType);
    }

    if (dateFrom) {
      query += ` AND DATE(p.created_at) >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ` AND DATE(p.created_at) <= ?`;
      params.push(dateTo);
    }

    query += ` ORDER BY p.created_at DESC`;

    const [payments] = await connection.query<RowDataPacket[]>(query, params);

    // Transform data to match frontend interface
    const transformedPayments = payments.map(payment => ({
      id: payment.id,
      userId: payment.userId,
      userName: payment.userName,
      userEmail: payment.userEmail,
      membershipType: payment.membershipType,
      amount: parseFloat(payment.amount),
      currency: payment.currency || 'TZS',
      status: payment.status,
      paymentMethod: payment.paymentMethod || 'Unknown',
      transactionId: payment.transactionId,
      paymentDate: payment.paymentDate || payment.createdAt,
      dueDate: payment.createdAt, // Using created_at as due date for now
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      checkoutUrl: payment.checkoutUrl,
      phoneNumber: payment.phoneNumber,
    }));

    return NextResponse.json(transformedPayments);

  } catch (error: any) {
    console.error('Error in GET /api/admin/payments/list:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to load payments',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
