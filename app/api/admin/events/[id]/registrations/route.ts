import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const resolvedParams = await params;
    const eventId = resolvedParams.id;

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
    
    const [registrations] = await connection.query<RowDataPacket[]>(
      `SELECT 
        er.id,
        er.user_id,
        er.event_id,
        er.registered_at,
        er.status,
        u.name,
        u.email,
        up.phone
      FROM event_registrations er
      LEFT JOIN users u ON er.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE er.event_id = ?
      ORDER BY er.registered_at DESC`,
      [eventId]
    );

    return NextResponse.json(registrations);

  } catch (error) {
    console.error('Error fetching event registrations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch registrations' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
