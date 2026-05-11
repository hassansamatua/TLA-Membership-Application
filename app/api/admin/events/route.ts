import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

async function getEventColumns(connection: any) {
  const [rows] = await connection.query('SHOW COLUMNS FROM events');
  return new Set(((rows as any[]) || []).map((r: any) => String(r.Field)));
}

function toDateString(value: unknown) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toTimeString(value: unknown) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 16);
}

function addHoursToMysqlDateTime(mysqlDateTime: string, hours: number) {
  const d = new Date(mysqlDateTime.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return mysqlDateTime;
  d.setHours(d.getHours() + hours);
  return `${d.toISOString().slice(0, 19).replace('T', ' ')}`;
}

function normalizeEventRow(row: any) {
  const start = row.start_time ?? row.startTime ?? row.start_date ?? row.startDate ?? row.date ?? null;
  const date = row.date ?? toDateString(start);
  const time = row.time ?? toTimeString(start);
  const maxAttendees = row.maxAttendees ?? row.max_attendees ?? row.capacity ?? row.max_attendee ?? row.maxCapacity ?? null;
  const currentAttendees = row.currentAttendees ?? row.current_attendees ?? row.attendee_count ?? row.attendees ?? 0;
  const fee = row.fee !== undefined ? parseFloat(row.fee) : 0;
  const isFree = row.isFree !== undefined ? Boolean(row.isFree) : (fee <= 0);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    date,
    time,
    location: row.location ?? '',
    maxAttendees: maxAttendees === null || maxAttendees === undefined ? null : Number(maxAttendees),
    currentAttendees: Number(currentAttendees) || 0,
    fee,
    isFree,
    status: row.status ?? 'upcoming',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : row.createdAt ?? null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : row.updatedAt ?? null,
    // Include the original start_time for reference
    start_time: row.start_time
  };
}

export async function GET(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);

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

    let events: RowDataPacket[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT e.*, 
           (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) as attendee_count
         FROM events e
         ORDER BY e.created_at DESC`
      );
      events = rows;
    } catch {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM events ORDER BY created_at DESC'
      );
      events = rows;
    }

    return NextResponse.json(events.map(normalizeEventRow));
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { message: 'Failed to fetch events' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);

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
    const description = body?.description ? String(body.description) : null;
    const location = body?.location ? String(body.location) : null;
    const status = body?.status ? String(body.status) : 'upcoming';

    const date = body?.date || body?.start_date || body?.startDate || null;
    const time = body?.time || null;
    const capacityRaw = body?.maxAttendees ?? body?.max_attendees ?? body?.capacity ?? null;
    const capacity = capacityRaw === null || capacityRaw === undefined || capacityRaw === '' ? null : Number(capacityRaw);
    const fee = body?.fee !== undefined ? parseFloat(body.fee) : 0;

    if (!title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    connection = await pool.getConnection();
    const columns = await getEventColumns(connection);

    if (columns.has('start_time') && columns.has('end_time')) {
      if (!date || !time) {
        return NextResponse.json({ message: 'Date and time are required' }, { status: 400 });
      }

      const startTime = `${String(date)} ${String(time)}:00`;
      const endTime = addHoursToMysqlDateTime(startTime, 2);

      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO events (title, description, location, start_time, end_time, capacity, status, created_by, fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, description, location, startTime, endTime, capacity, status, decoded.id, fee]
      );

      const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM events WHERE id = ?', [result.insertId]);
      return NextResponse.json(
        { message: 'Event created successfully', event: rows?.[0] ? normalizeEventRow(rows[0]) : null },
        { status: 201 }
      );
    }

    if (columns.has('start_date') && columns.has('end_date')) {
      const startDate = date ? String(date) : null;
      const endDate = body?.end_date || body?.endDate || date || null;
      if (!startDate || !endDate) {
        return NextResponse.json({ message: 'Start date and end date are required' }, { status: 400 });
      }

      const [result] = await connection.query<ResultSetHeader>(
        'INSERT INTO events (title, description, location, start_date, end_date, max_attendees, status, created_by, fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, description, location, startDate, String(endDate), capacity, status, decoded.id, fee]
      );

      const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM events WHERE id = ?', [result.insertId]);
      return NextResponse.json(
        { message: 'Event created successfully', event: rows?.[0] ? normalizeEventRow(rows[0]) : null },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: 'Events table schema is not supported. Expected start_time/end_time or start_date/end_date columns.' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { message: 'Failed to create event' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
