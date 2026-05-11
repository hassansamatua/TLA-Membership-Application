import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  let connection;
  try {
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

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
        { status: 403}
      );
    }

    connection = await pool.getConnection();

    // Get contact content from database
    const [contactContent] = await connection.query<RowDataPacket[]>(
      'SELECT id, section_key, section_type, content, order_index, is_active FROM contact_content ORDER BY order_index'
    );

    return NextResponse.json(contactContent);
  } catch (error) {
    console.error('Error fetching contact content:', error);
    return NextResponse.json(
      { message: 'Failed to fetch contact content' },
      { status: 500}
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(request: Request) {
  let connection;
  try {
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401}
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401}
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403}
      );
    }

    const body = await request.json();
    const { section_key, section_type, content, order_index, is_active } = body;

    connection = await pool.getConnection();

    // Insert new contact content
    const [result] = await connection.query(
      'INSERT INTO contact_content (section_key, section_type, content, order_index, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [section_key, section_type, content, order_index || 0, is_active !== undefined ? is_active : true]
    );

    return NextResponse.json({
      message: 'Contact content created successfully',
      id: (result as any).insertId
    });
  } catch (error) {
    console.error('Error creating contact content:', error);
    return NextResponse.json(
      { message: 'Failed to create contact content' },
      { status: 500}
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(request: Request) {
  let connection;
  try {
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401}
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401}
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403}
      );
    }

    const body = await request.json();
    const { id, section_key, section_type, content, order_index, is_active } = body;

    connection = await pool.getConnection();

    // Update contact content
    const [result] = await connection.query(
      'UPDATE contact_content SET section_key = ?, section_type = ?, content = ?, order_index = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [section_key, section_type, content, order_index, is_active, id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Contact content not found' },
        { status: 404}
      );
    }

    return NextResponse.json({
      message: 'Contact content updated successfully'
    });
  } catch (error) {
    console.error('Error updating contact content:', error);
    return NextResponse.json(
      { message: 'Failed to update contact content' },
      { status: 500}
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(request: Request) {
  let connection;
  try {
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401}
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401}
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403}
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'Content ID required' },
        { status: 400}
      );
    }

    connection = await pool.getConnection();

    // Delete contact content
    const [result] = await connection.query('DELETE FROM contact_content WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Contact content not found' },
        { status: 404}
      );
    }

    return NextResponse.json({
      message: 'Contact content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact content:', error);
    return NextResponse.json(
      { message: 'Failed to delete contact content' },
      { status: 500}
    );
  } finally {
    if (connection) connection.release();
  }
}
