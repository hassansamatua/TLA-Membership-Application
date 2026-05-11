import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { RowDataPacket } from 'mysql2/promise';

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

// GET - Fetch news/notifications for current user
export async function GET(request: Request) {
  const connection = await pool.getConnection();

  try {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get user information to check role
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT is_admin, is_approved FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    const isAdmin = user.is_admin;
    const isApproved = user.is_approved;

    // Build WHERE clause based on user role and approval status
    let whereClause = 'WHERE n.is_active = 1 AND (n.expires_at IS NULL OR n.expires_at > NOW())';
    const queryParams: any[] = [];

    if (isAdmin) {
      // Admins can see all news
      whereClause += ' AND (n.target_audience = "all" OR n.target_audience = "admin")';
    } else if (isApproved) {
      // Approved members can see member and all news
      whereClause += ' AND (n.target_audience = "all" OR n.target_audience = "members")';
    } else {
      // Unapproved users can only see general news
      whereClause += ' AND n.target_audience = "all"';
    }

    // Get news with sender information and read status
    const [news] = await connection.query<RowDataPacket[]>(
      `SELECT n.*, u.name as sender_name,
              CASE WHEN unr.user_id IS NOT NULL THEN true ELSE false END as is_read
       FROM news_notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       LEFT JOIN user_notification_reads unr ON n.id = unr.notification_id AND unr.user_id = ?
       ${whereClause}
       ORDER BY 
         CASE 
           WHEN n.priority = 'urgent' THEN 1
           WHEN n.priority = 'high' THEN 2
           WHEN n.priority = 'medium' THEN 3
           WHEN n.priority = 'low' THEN 4
         END,
         n.sent_at DESC
       LIMIT ? OFFSET ?`,
      [decoded.id, ...queryParams, limit, offset]
    );

    // Get total count
    const [countResult] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM news_notifications n ${whereClause}`,
      queryParams
    );

    // Get unread count
    const [unreadResult] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) as unread 
       FROM news_notifications n
       LEFT JOIN user_notification_reads unr ON n.id = unr.notification_id AND unr.user_id = ?
       ${whereClause} AND unr.user_id IS NULL`,
      [decoded.id, ...queryParams]
    );

    return NextResponse.json({
      success: true,
      news: news,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      },
      unreadCount: unreadResult[0].unread
    });

  } catch (error: any) {
    console.error('Error in GET /api/news:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// POST - Mark notification as read
export async function POST(request: Request) {
  console.log('🚀 POST /api/news - Starting request processing');
  
  const connection = await pool.getConnection();

  try {
    console.log('🔍 POST /api/news called');
    
    const token = await getAuthToken(request);
    console.log('🔍 Token found:', !!token);

    if (!token) {
      console.log('❌ No token found');
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    console.log('🔍 Token decoded:', { id: decoded?.id, isAdmin: decoded?.isAdmin });
    
    if (!decoded?.id) {
      console.log('❌ Invalid token');
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log('🔍 Request body parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { notificationId } = body;
    console.log('🔍 Request body:', { notificationId });

    if (!notificationId) {
      console.log('❌ No notificationId provided');
      return NextResponse.json(
        { success: false, message: 'Notification ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Attempting to mark notification', notificationId, 'as read for user', decoded.id);

    // First check if notification exists and user has access
    const [notificationCheck] = await connection.query(
      `SELECT id FROM news_notifications WHERE id = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [notificationId]
    );

    if (!notificationCheck || (Array.isArray(notificationCheck) && notificationCheck.length === 0)) {
      console.log('❌ Notification not found or expired:', notificationId);
      return NextResponse.json(
        { success: false, message: 'Notification not found or expired' },
        { status: 404 }
      );
    }

    // Check if already read
    const [readCheck] = await connection.query(
      `SELECT id FROM user_notification_reads WHERE user_id = ? AND notification_id = ?`,
      [decoded.id, notificationId]
    );

    if (readCheck && Array.isArray(readCheck) && readCheck.length > 0) {
      console.log('ℹ️ Notification already marked as read');
      return NextResponse.json({
        success: true,
        message: 'Notification already marked as read'
      });
    }

    // Mark as read
    const result = await connection.query(
      `INSERT INTO user_notification_reads (user_id, notification_id, read_at)
       VALUES (?, ?, NOW())`,
      [decoded.id, notificationId]
    );
    
    console.log('🔍 Insert result:', result);
    console.log('✅ Successfully completed POST /api/news');

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/news:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Ensure we always return a proper JSON response
    try {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Internal server error: ' + (error?.message || 'Unknown error'),
          ...(process.env.NODE_ENV === 'development' && { 
            error: error?.message || 'Unknown error',
            stack: error?.stack 
          })
        },
        { status: 500 }
      );
    } catch (jsonError) {
      console.error('❌ Failed to create JSON response:', jsonError);
      return new Response('Internal Server Error', { status: 500 });
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
