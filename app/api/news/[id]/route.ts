import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (authToken) return authToken;

  try {
    const cookieStore = await cookies();
    return cookieStore.get('token')?.value || null;
  } catch {
    const cookieHeader = request.headers.get('cookie');
    return cookieHeader
      ? cookieHeader
          .split('; ')
          .find(c => c.trim().startsWith('token='))
          ?.split('=')[1] || null
      : null;
  }
}

// POST - Toggle notification read status (mark as read or unread)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  let action: string | undefined;

  try {
    const { id } = await params;
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    action = pathSegments[pathSegments.length - 1]; // 'read' or 'unread'

    if (!action || !['read', 'unread'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use /read or /unread' },
        { status: 400 }
      );
    }

    const userId = decoded.id;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid news ID' },
        { status: 400 }
      );
    }

    console.log(`🔄 ${action.toUpperCase()} news ${newsId} for user ${userId}`);

    if (action === 'read') {
      // Mark as read - insert or update the read record
      await connection.execute(
        `INSERT INTO user_notification_reads (user_id, notification_id, read_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE read_at = NOW()`,
        [userId, newsId]
      );

      console.log(`✅ News ${newsId} marked as read for user ${userId}`);
    } else if (action === 'unread') {
      // Mark as unread - delete the read record
      await connection.execute(
        `DELETE FROM user_notification_reads 
         WHERE user_id = ? AND notification_id = ?`,
        [userId, newsId]
      );

      console.log(`✅ News ${newsId} marked as unread for user ${userId}`);
    }

    return NextResponse.json({
      success: true,
      message: `News ${action} successfully`,
      data: {
        newsId,
        userId,
        action
      }
    });

  } catch (error: any) {
    console.error(`❌ Error marking news as ${action}:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update news status',
        error: error.message 
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
