import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  max_attendees: number;
  current_attendees: number;
  price: number;
  is_free: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const userId = decoded.id;

    const connection = await pool.getConnection();
    try {
      // First, get all upcoming events
      const [events] = await connection.query<RowDataPacket[]>(
        `SELECT e.*, 
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) as current_attendees,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.user_id = ?) as user_registered,
                CASE 
                  WHEN (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) >= e.capacity THEN 'FULL'
                  WHEN e.start_time < NOW() THEN 'PAST'
                  ELSE 'UPCOMING'
                END as event_status
         FROM events e
         WHERE e.status = 'upcoming'
         ORDER BY e.start_time ASC`,
        [userId]
      );

      // Map database fields to frontend interface
      const mappedEvents = events.map(event => ({
        ...event,
        price: event.fee || 0, // Map fee to price for frontend compatibility
        is_free: event.fee === 0 || event.fee === null || event.fee === undefined
      }));

      return NextResponse.json({ events: mappedEvents });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const userId = decoded.id;
    const { title, description, date, time, location, max_attendees, price, is_free, image_url } = await request.json();

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO events (title, description, date, time, location, max_attendees, price, is_free, image_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [title, description, date, time, location, max_attendees, price, is_free, image_url]
      );

      // Get the created event
      const [newEvent] = await connection.query<RowDataPacket[]>(
        `SELECT e.*, 
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) as current_attendees
         FROM events e
         WHERE e.id = ?`,
        [result.insertId]
      );

      return NextResponse.json({ 
        event: newEvent[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

// Helper function to get auth token (same as other APIs)
async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}
