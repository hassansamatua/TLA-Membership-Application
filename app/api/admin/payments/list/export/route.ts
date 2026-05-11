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

// GET - Export all payments as CSV
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
        p.user_id,
        u.name as userName,
        u.email as userEmail,
        p.membership_type,
        p.amount,
        p.currency,
        p.status,
        p.payment_method,
        p.transaction_id,
        p.created_at,
        p.updated_at,
        p.paid_at,
        p.phone_number
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

    // Generate CSV
    const headers = [
      'ID',
      'User Name',
      'User Email',
      'Membership Type',
      'Amount',
      'Currency',
      'Status',
      'Payment Method',
      'Transaction ID',
      'Phone Number',
      'Created Date',
      'Payment Date',
      'Updated Date'
    ];

    const csvRows = [
      headers.join(','),
      ...payments.map(payment => [
        payment.id,
        `"${payment.userName}"`,
        `"${payment.userEmail}"`,
        payment.membership_type,
        payment.amount,
        payment.currency || 'TZS',
        payment.status,
        `"${payment.payment_method || ''}"`,
        `"${payment.transaction_id || ''}"`,
        `"${payment.phone_number || ''}"`,
        payment.created_at,
        payment.paid_at || '',
        payment.updated_at
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/payments/list/export:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to export payments',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
