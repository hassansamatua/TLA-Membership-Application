/**
 * Admin Membership Rejection API
 * When admin rejects a user, this endpoint:
 * 1. Updates rejection status
 * 2. Sends rejection notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendRejectionNotification } from '@/lib/notificationService';
import type { RowDataPacket } from 'mysql2';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    // Check if user is admin
    const connection = await pool.getConnection();
    try {
      const [adminCheck] = await connection.query<RowDataPacket[]>(
        'SELECT is_admin FROM users WHERE id = ?',
        [decoded.id]
      ) as [RowDataPacket[], any];

      if (!adminCheck[0]?.is_admin) {
        return NextResponse.json({ error: 'Only admins can reject members' }, { status: 403 });
      }
    } finally {
      connection.release();
    }

    const { userId, rejectionReason } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const rejectConnection = await pool.getConnection();
    
    try {
      await rejectConnection.beginTransaction();

      // 1. Mark user as rejected
      const [result] = await rejectConnection.query(
        `UPDATE users SET is_approved = FALSE, updated_at = NOW() WHERE id = ?`,
        [userId]
      ) as any;

      if (result.affectedRows === 0) {
        await rejectConnection.rollback();
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 2. Get user details
      const [userRows] = await rejectConnection.query<RowDataPacket[]>(
        `SELECT id, name, email FROM users WHERE id = ?`,
        [userId]
      ) as [RowDataPacket[], any];

      const user = userRows[0];

      await rejectConnection.commit();

      // 3. Send rejection notification (outside transaction)
      try {
        console.log(`[REJECT] Attempting to send rejection notification to ${user.email}`);
        const notificationSent = await sendRejectionNotification(userId, user.name, rejectionReason);
        console.log(`[REJECT] Notification send result:`, notificationSent);
      } catch (notifyError) {
        console.error('[REJECT] Error sending rejection notification:', notifyError);
        // Don't fail the request if notification fails
      }

      return NextResponse.json({
        success: true,
        message: 'User rejected and notification sent',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });

    } catch (error) {
      await rejectConnection.rollback();
      throw error;
    } finally {
      rejectConnection.release();
    }

  } catch (error) {
    console.error('Rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject user' },
      { status: 500 }
    );
  }
}
