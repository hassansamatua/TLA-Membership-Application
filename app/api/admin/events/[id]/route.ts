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
      `SELECT e.*, u.name as created_by_name, u.email as created_by_email
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
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

export async function PATCH(
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

    const body = await request.json().catch(() => ({} as any));
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    
    const [result] = await connection.query<ResultSetHeader>(
      'UPDATE events SET status = ? WHERE id = ?',
      [status, eventId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }

    const [updatedEvent] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );

    return NextResponse.json({
      message: 'Event status updated successfully',
      event: updatedEvent[0]
    });

  } catch (error) {
    console.error('Error updating event status:', error);
    return NextResponse.json(
      { message: 'Failed to update event status' },
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

    const body = await request.json().catch(() => ({} as any));

    const title = body?.title ? String(body.title) : '';
    const description = body?.description !== undefined ? String(body.description) : null;
    const location = body?.location !== undefined ? String(body.location) : null;
    const incomingStatus = body?.status ? String(body.status) : null;

    const date = body?.date || body?.start_date || body?.startDate || null;
    const time = body?.time || null;

    const capacityRaw = body?.maxAttendees ?? body?.max_attendees ?? body?.capacity ?? null;
    const capacityParsed = capacityRaw === null || capacityRaw === undefined || capacityRaw === '' ? null : Number(capacityRaw);
    const capacity = Number.isFinite(capacityParsed as number) ? (capacityParsed as number) : null;
    const fee = body?.fee !== undefined ? parseFloat(body.fee) : 0;

    if (!title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    connection = await pool.getConnection();

    const [existingEvents] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );

    if (existingEvents.length === 0) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }

    const existingEvent = existingEvents[0] as any;
    const status = incomingStatus ?? existingEvent.status ?? 'upcoming';

    const [columnRows] = await connection.query('SHOW COLUMNS FROM events');
    const columns = new Set(((columnRows as any[]) || []).map((r: any) => String(r.Field)));

    const capacityColumn = columns.has('capacity')
      ? 'capacity'
      : columns.has('max_attendees')
        ? 'max_attendees'
        : null;
    const capacityValue = capacityColumn ? (capacity ?? existingEvent[capacityColumn] ?? null) : null;

    const addHoursToMysqlDateTime = (mysqlDateTime: string, hours: number) => {
      const d = new Date(mysqlDateTime.replace(' ', 'T'));
      if (Number.isNaN(d.getTime())) return mysqlDateTime;
      d.setHours(d.getHours() + hours);
      return `${d.toISOString().slice(0, 19).replace('T', ' ')}`;
    };

    let result: ResultSetHeader;

    if (columns.has('start_time') && columns.has('end_time')) {
      if (!date || !time) {
        return NextResponse.json({ message: 'Date and time are required' }, { status: 400 });
      }

      const startTime = `${String(date)} ${String(time)}:00`;
      const endTime = addHoursToMysqlDateTime(startTime, 2);

      const setCapacitySql = capacityColumn ? `, ${capacityColumn} = ?` : '';
      const updateParams: any[] = [title, description, location, startTime, endTime];
      if (capacityColumn) updateParams.push(capacityValue);
      updateParams.push(status, fee, eventId);

      const [updateResult] = await connection.query<ResultSetHeader>(
        `UPDATE events 
         SET title = ?, description = ?, location = ?, start_time = ?, end_time = ?${setCapacitySql}, status = ?, fee = ?
         WHERE id = ?`,
        updateParams
      );
      result = updateResult;
    } else if (columns.has('start_date') && columns.has('end_date')) {
      if (!date) {
        return NextResponse.json({ message: 'Date is required' }, { status: 400 });
      }

      const startDate = String(date);
      const endDate = String(body?.end_date || body?.endDate || date);

      const setCapacitySql = capacityColumn ? `, ${capacityColumn} = ?` : '';
      const updateParams: any[] = [title, description, location, startDate, endDate];
      if (capacityColumn) updateParams.push(capacityValue);
      updateParams.push(status, fee, eventId);

      const [updateResult] = await connection.query<ResultSetHeader>(
        `UPDATE events 
         SET title = ?, description = ?, location = ?, start_date = ?, end_date = ?${setCapacitySql}, status = ?, fee = ?
         WHERE id = ?`,
        updateParams
      );
      result = updateResult;
    } else {
      return NextResponse.json(
        { message: 'Events table schema is not supported.' },
        { status: 500 }
      );
    }

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
    
    // Check if event exists
    const [existingEvents] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM events WHERE id = ?',
      [eventId]
    );

    if (existingEvents.length === 0) {
      return NextResponse.json(
        { message: 'Event not found' },
        { status: 404 }
      );
    }

    // Delete event (attendance records will be deleted due to foreign key constraint)
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
