import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { RowDataPacket } from 'mysql2/promise';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function GET(request: Request) {
  const connection = await pool.getConnection();

  try {
    const token = await getAuthToken(request);
    console.log('Token found:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('No token provided');
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    console.log('Token decoded:', decoded);
    console.log('Is admin:', decoded?.isAdmin);
    
    if (!decoded?.isAdmin) {
      console.log('Admin access denied');
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all payment records (frontend expects array of payments)
    console.log('Fetching all payment records...');
    const [payments] = await connection.query<RowDataPacket[]>(
      `SELECT *, YEAR(created_at) as payment_year FROM payments ORDER BY created_at DESC`
    );
    
    console.log('Payments query result:', payments.length, 'records');

    return NextResponse.json(payments);

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payment statistics' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
