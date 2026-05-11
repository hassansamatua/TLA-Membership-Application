import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const userId = decoded.id;
    const { messageId, content } = await request.json();

    const connection = await pool.getConnection();
    try {
      // Mark message as read
      await connection.query(
        'UPDATE messages SET read_at = NOW() WHERE id = ?',
        [messageId]
      );
      
      // Get message details for reply
      const [messageInfo] = await connection.query<RowDataPacket[]>(
        `SELECT m.*, u1.name as sender_name, u1.email as sender_email, u2.name as receiver_name, u2.email as receiver_email
         FROM messages m
         JOIN users u1 ON m.sender_id = u1.id
         JOIN users u2 ON m.receiver_id = u2.id
         WHERE m.id = ?`,
        [messageId]
      );

      if (messageInfo.length === 0) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      // Create reply message
      const [replyResult] = await connection.query<RowDataPacket[]>(
        `INSERT INTO messages (sender_id, receiver_id, subject, content, created_at, read_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [userId, messageInfo[0].receiver_id, `Re: ${messageInfo[0].subject}`, content]
      );

      // Get the reply with sender info
      const [replyWithInfo] = await connection.query<RowDataPacket[]>(
        `SELECT m.*, u1.name as sender_name, u1.email as sender_email, u2.name as receiver_name, u2.email as receiver_email
         FROM messages m
         JOIN users u1 ON m.sender_id = u1.id
         JOIN users u2 ON m.receiver_id = u2.id
         WHERE m.id = ?`,
        [replyResult.insertId]
      );

      return NextResponse.json({ 
        message: replyWithInfo[0]
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
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
