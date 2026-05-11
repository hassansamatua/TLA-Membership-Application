import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
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
    
    const [events] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );

    if (events.length === 0) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(events[0]);

  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { message: 'Failed to fetch event' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(
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

    const body = await request.json();
    const {
      title,
      description,
      location,
      start_date,
      end_date,
      max_attendees,
      status
    } = body;

    connection = await pool.getConnection();
    
    const [result] = await connection.query<ResultSetHeader>(
      'UPDATE events SET title = ?, description = ?, location = ?, start_date = ?, end_date = ?, max_attendees = ?, status = ? WHERE id = ?',
      [title, description, location, start_date, end_date, max_attendees, status, eventId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: 'Failed to update event' },
        { status: 500 }
      );
    }

    const [updatedEvent] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );

    return NextResponse.json({
      message: 'Event updated successfully',
      event: updatedEvent[0]
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { message: 'Failed to update event' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(
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
    
    const [result] = await connection.query<ResultSetHeader>(
      'DELETE FROM events WHERE id = ?',
      [eventId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: 'Failed to delete event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { message: 'Failed to delete event' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
