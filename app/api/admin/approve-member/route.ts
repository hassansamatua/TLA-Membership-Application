/**
 * Admin Membership Approval API
 * When admin approves a user, this endpoint:
 * 1. Updates approval status
 * 2. Initializes membership cycles
 * 3. Sends approval notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { initializeUserCycles } from '@/lib/membershipCycles';
import { sendApprovalNotification } from '@/lib/notificationService';
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
        return NextResponse.json({ error: 'Only admins can approve members' }, { status: 403 });
      }
    } finally {
      connection.release();
    }

    const { userId, membershipType = 'personal' } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const approvalConnection = await pool.getConnection();
    
    try {
      await approvalConnection.beginTransaction();

      // 1. Mark user as approved
      const [result] = await approvalConnection.query(
        `UPDATE users SET is_approved = TRUE, updated_at = NOW() WHERE id = ?`,
        [userId]
      ) as any;

      if (result.affectedRows === 0) {
        await approvalConnection.rollback();
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 2. Get user details
      const [userRows] = await approvalConnection.query<RowDataPacket[]>(
        `SELECT id, name, email FROM users WHERE id = ?`,
        [userId]
      ) as [RowDataPacket[], any];

      const user = userRows[0];

      // 3. Initialize membership cycles for the user
      await initializeUserCycles(userId, new Date(), membershipType);

      // 4. Create initial membership record
      await approvalConnection.query(
        `INSERT IGNORE INTO memberships 
         (user_id, membership_type, status, payment_status, created_at)
         VALUES (?, ?, 'active', 'pending', NOW())`,
        [userId, membershipType]
      );

      await approvalConnection.commit();

      // 5. Send approval notification (outside transaction)
      try {
        console.log(`[APPROVE] Attempting to send approval notification to ${user.email}`);
        const notificationSent = await sendApprovalNotification(userId, user.name, membershipType);
        console.log(`[APPROVE] Notification send result:`, notificationSent);
      } catch (notifyError) {
        console.error('[APPROVE] Error sending approval notification:', notifyError);
        // Don't fail the request if notification fails
      }

      return NextResponse.json({
        success: true,
        message: 'User approved and notification sent',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });

    } catch (error) {
      await approvalConnection.rollback();
      throw error;
    } finally {
      approvalConnection.release();
    }

  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve user' },
      { status: 500 }
    );
  }
}
