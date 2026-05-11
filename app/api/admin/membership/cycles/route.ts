import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  let connection;
  try {
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

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

    // Get membership cycles/periods from user_profiles table
    const [cycles] = await connection.query<RowDataPacket[]>(
      'SELECT DISTINCT membership_expiry FROM user_profiles WHERE membership_expiry IS NOT NULL AND membership_expiry != "" ORDER BY membership_expiry'
    );

    const cycleData = cycles.map(row => ({
      expiryDate: row.membership_expiry,
      label: new Date(row.membership_expiry).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      })
    }));

    return NextResponse.json(cycleData);
  } catch (error) {
    console.error('Error fetching membership cycles:', error);
    return NextResponse.json(
      { message: 'Failed to fetch membership cycles' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
