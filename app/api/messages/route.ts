import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  subject: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_name: string;
  receiver_name: string;
  sender_email: string;
  receiver_email: string;
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
      const [messages] = await connection.query<RowDataPacket[]>(
        `SELECT m.*, u.name as sender_name, u.email as sender_email 
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.receiver_id = ? OR m.sender_id = ?
         ORDER BY m.created_at DESC`,
        [userId]
      );

      return NextResponse.json({ messages });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
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
    const { receiver_id, subject, content } = await request.json();

    const connection = await pool.getConnection();
    try {
      // Get receiver info
      const [receiverInfo] = await connection.query<RowDataPacket[]>(
        'SELECT name, email FROM users WHERE id = ?',
        [receiver_id]
      );

      if (receiverInfo.length === 0) {
        return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
      }

      // Create message
      const [result] = await connection.query<RowDataPacket[]>(
        `INSERT INTO messages (sender_id, receiver_id, subject, content, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, receiver_id, subject, content]
      );

      // Get the created message with sender info
      const [newMessage] = await connection.query<RowDataPacket[]>(
        `SELECT m.*, u.name as sender_name, u.email as sender_email 
         FROM messages m
         INNER JOIN users u ON m.sender_id = u.id
         WHERE m.id = ?`,
        [result.insertId]
      );

      return NextResponse.json({ 
        message: newMessage[0] 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
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
