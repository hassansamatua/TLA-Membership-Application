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

// GET - Fetch all news/notifications
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

    // Get news with sender information
    const [news] = await connection.query<RowDataPacket[]>(
      `SELECT n.*, u.name as sender_name 
       FROM news_notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       ORDER BY n.sent_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count
    const [countResult] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM news_notifications'
    );

    return NextResponse.json({
      success: true,
      news: news,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/news:', error);
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

// POST - Create new news/notification
export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      title,
      message,
      type = 'news',
      targetAudience = 'all',
      targetUsers = null,
      priority = 'medium',
      expiresAt = null
    } = body;

    // Validation
    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Title and message are required' },
        { status: 400 }
      );
    }

    if (targetAudience === 'specific' && (!targetUsers || !Array.isArray(targetUsers) || targetUsers.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'Target users are required when audience is specific' },
        { status: 400 }
      );
    }

    // Insert news/notification
    const [result] = await connection.query(
      `INSERT INTO news_notifications 
       (title, message, type, target_audience, target_users, sender_id, priority, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        message,
        type,
        targetAudience,
        targetUsers ? JSON.stringify(targetUsers) : null,
        decoded.id,
        priority,
        expiresAt
      ]
    ) as any;

    return NextResponse.json({
      success: true,
      message: 'News/notification created successfully',
      newsId: result.insertId
    });

  } catch (error: any) {
    console.error('Error in POST /api/admin/news:', error);
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

// PUT - Update news/notification
export async function PUT(request: Request) {
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
    const newsId = searchParams.get('id');

    if (!newsId) {
      return NextResponse.json(
        { success: false, message: 'News ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      message,
      type,
      targetAudience,
      targetUsers,
      priority,
      expiresAt,
      isActive
    } = body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (message !== undefined) {
      updateFields.push('message = ?');
      updateValues.push(message);
    }
    if (type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    if (targetAudience !== undefined) {
      updateFields.push('target_audience = ?');
      updateValues.push(targetAudience);
    }
    if (targetUsers !== undefined) {
      updateFields.push('target_users = ?');
      updateValues.push(targetUsers ? JSON.stringify(targetUsers) : null);
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(priority);
    }
    if (expiresAt !== undefined) {
      updateFields.push('expires_at = ?');
      updateValues.push(expiresAt);
    }
    if (isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No fields to update' },
        { status: 400 }
      );
    }

    updateValues.push(newsId);

    await connection.query(
      `UPDATE news_notifications SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      message: 'News/notification updated successfully'
    });

  } catch (error: any) {
    console.error('Error in PUT /api/admin/news:', error);
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

// DELETE - Delete news/notification
export async function DELETE(request: Request) {
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
    const newsId = searchParams.get('id');

    if (!newsId) {
      return NextResponse.json(
        { success: false, message: 'News ID is required' },
        { status: 400 }
      );
    }

    await connection.query('DELETE FROM news_notifications WHERE id = ?', [newsId]);

    return NextResponse.json({
      success: true,
      message: 'News/notification deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/admin/news:', error);
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
