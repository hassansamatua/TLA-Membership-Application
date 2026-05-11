// app/api/admin/deleted-users/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

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
    const [users] = await connection.query(`
      SELECT du.*, u.name as deleted_by_name 
      FROM deleted_users du
      LEFT JOIN users u ON du.deleted_by = u.id
      ORDER BY du.deleted_at DESC
    `);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching deleted users:', error);
    return NextResponse.json(
      { message: 'Failed to fetch deleted users' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}