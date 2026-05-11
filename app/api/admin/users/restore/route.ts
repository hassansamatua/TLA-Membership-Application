// app/api/admin/users/restore/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request) {
  const { userId } = await request.json();
  let connection;

  try {
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Get user data from deleted_users
      const [deletedUsers] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM deleted_users WHERE user_id = ? ORDER BY deleted_at DESC LIMIT 1',
        [userId]
      );

      if (deletedUsers.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No deleted user found with this ID' },
          { status: 404 }
        );
      }

      const deletedUser = deletedUsers[0];
      const originalData = JSON.parse(deletedUser.original_data);

      // 2. Insert back into users table
      await connection.query(
        'INSERT INTO users SET ?',
        [originalData]
      );

      // 3. Remove from deleted_users
      await connection.query(
        'DELETE FROM deleted_users WHERE id = ?',
        [deletedUser.id]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: 'User restored successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error restoring user:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to restore user'
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}