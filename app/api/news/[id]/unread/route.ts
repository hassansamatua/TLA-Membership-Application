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

// POST - Mark notification as unread
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();

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

    const userId = decoded.id;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid news ID' },
        { status: 400 }
      );
    }

    console.log(`📖 UNREAD news ${newsId} for user ${userId}`);

    // Mark as unread - delete the read record
    await connection.execute(
      `DELETE FROM user_notification_reads 
       WHERE user_id = ? AND notification_id = ?`,
      [userId, newsId]
    );

    console.log(`✅ News ${newsId} marked as unread for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'News marked as unread successfully',
      data: {
        newsId,
        userId,
        action: 'unread'
      }
    });

  } catch (error: any) {
    console.error('❌ Error marking news as unread:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to mark news as unread',
        error: error.message 
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
