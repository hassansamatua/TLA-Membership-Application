import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const userId = decoded.id;
    const { id: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr);

    const connection = await pool.getConnection();
    try {
      // Check if user is already registered
      const [existingRegistration] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );

      if (existingRegistration.length > 0) {
        return NextResponse.json({ error: 'Already registered for this event' }, { status: 400 });
      }

      // Check if event is fully booked
      const [eventInfo] = await connection.query<RowDataPacket[]>(
        'SELECT capacity, (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = ?) as current_attendees FROM events WHERE id = ?',
        [eventId, eventId]
      );

      if (eventInfo.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const event = eventInfo[0];
      if (event.current_attendees >= event.capacity) {
        return NextResponse.json({ error: 'Event is fully booked' }, { status: 400 });
      }

      // Start a transaction
      await connection.beginTransaction();

      try {
        // Register for event
        await connection.query(
          'INSERT INTO event_registrations (event_id, user_id, registered_at) VALUES (?, ?, NOW())',
          [eventId, userId]
        );

        // Get updated attendee count
        const [result] = await connection.query<RowDataPacket[]>(
          'SELECT COUNT(*) as attendeeCount FROM event_registrations WHERE event_id = ?',
          [eventId]
        );
        const attendeeCount = result[0]?.attendeeCount || 0;

        await connection.commit();
        
        return NextResponse.json({ 
          success: true, 
          attendeeCount: attendeeCount || 0 
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error registering for event:', error);
    return NextResponse.json({ error: 'Failed to register for event' }, { status: 500 });
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
