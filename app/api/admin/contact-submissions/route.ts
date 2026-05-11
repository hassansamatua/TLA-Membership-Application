import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function GET(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    connection = await pool.getConnection();

    // Fetch all contact submissions with read status
    const [submissions] = await connection.query(
      `SELECT id, name, email, subject, message, created_at, read_status, read_at 
       FROM contact_submissions 
       ORDER BY created_at DESC`
    );

    return NextResponse.json(submissions);

  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch contact submissions' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, readStatus } = body;

    if (!id || (readStatus !== 0 && readStatus !== 1)) {
      return NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Update read status
    const [result] = await connection.query(
      `UPDATE contact_submissions 
       SET read_status = ?, read_at = ? 
       WHERE id = ?`,
      [readStatus, readStatus === 1 ? new Date() : null, parseInt(id)]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: readStatus === 1 ? 'Submission marked as read' : 'Submission marked as unread',
      readStatus
    });

  } catch (error) {
    console.error('Error updating contact submission:', error);
    return NextResponse.json(
      { message: 'Failed to update submission' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get the submission ID from the URL
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { message: 'Invalid submission ID' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Delete the submission
    const [result] = await connection.query(
      'DELETE FROM contact_submissions WHERE id = ?',
      [parseInt(id)]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Submission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contact submission:', error);
    return NextResponse.json(
      { message: 'Failed to delete submission' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
