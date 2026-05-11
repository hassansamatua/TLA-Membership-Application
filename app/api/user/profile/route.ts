import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2/promise';

interface UserToken {
  id: number;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isApproved: boolean;
}

export async function PUT(request: Request) {
  let connection;
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token) as UserToken | null;
    if (!decoded) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    
    // Update the user's profile
    await connection.query(
      'UPDATE users SET name = ? WHERE id = ?',
      [name, decoded.id]
    );

    return NextResponse.json(
      { message: 'Profile updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function GET(request: Request) {
  let connection;
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token) as UserToken | null;
    if (!decoded) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    connection = await pool.getConnection();
    
    const [users] = await connection.query<UserRow[]>(
      'SELECT id, name, email, is_admin as isAdmin, is_approved as isApproved FROM users WHERE id = ?',
      [decoded.id]
    );

    const user = users[0];
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { message: 'Failed to fetch profile' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
