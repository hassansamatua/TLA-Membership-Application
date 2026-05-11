import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
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
        { status: 403 }
      );
    }

    connection = await pool.getConnection();

    // Get specific page from database
    const [pages] = await connection.query<RowDataPacket[]>(
      'SELECT id, title, slug, content, excerpt, status, page_type, meta_title, meta_description, meta_keywords, featured_image, template, author_id, created_at, updated_at FROM pages WHERE id = ?',
      [id]
    );

    if (pages.length === 0) {
      return NextResponse.json(
        { message: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(pages[0]);
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { message: 'Failed to fetch page' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
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
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, slug, content, excerpt, status, page_type, meta_title, meta_description, meta_keywords, featured_image, template } = body;

    connection = await pool.getConnection();

    // Update page
    const [result] = await connection.query(
      `UPDATE pages SET title = ?, slug = ?, content = ?, excerpt = ?, status = ?, page_type = ?, meta_title = ?, meta_description = ?, meta_keywords = ?, featured_image = ?, template = ?, updated_at = NOW() WHERE id = ?`,
      [title, slug, content, excerpt, status, page_type, meta_title, meta_description, meta_keywords, featured_image, template, id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Page updated successfully'
    });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { message: 'Failed to update page' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

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
        { status: 403 }
      );
    }

    connection = await pool.getConnection();

    // Delete page
    const [result] = await connection.query('DELETE FROM pages WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { message: 'Failed to delete page' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
