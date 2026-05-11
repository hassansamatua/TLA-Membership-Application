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
        { status: 403 }
      );
    }

    connection = await pool.getConnection();

    // Get pages from database
    const [pages] = await connection.query<RowDataPacket[]>(
      'SELECT id, title, slug, content, excerpt, status, page_type, meta_title, meta_description, meta_keywords, featured_image, template, author_id, created_at, updated_at FROM pages ORDER BY created_at DESC'
    );

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { message: 'Failed to fetch pages' },
      { status: 500 }
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

    // Insert new page
    const [result] = await connection.query(
      `INSERT INTO pages (title, slug, content, excerpt, status, page_type, meta_title, meta_description, meta_keywords, featured_image, template, author_id, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, slug, content, excerpt, status || 'draft', page_type || 'page', meta_title, meta_description, meta_keywords, featured_image, template || 'default', decoded.id]
    );

    const newPage = {
      id: (result as any).insertId,
      title,
      slug,
      content,
      excerpt,
      status: status || 'draft',
      page_type: page_type || 'page',
      meta_title,
      meta_description,
      meta_keywords,
      featured_image,
      template: template || 'default',
      author_id: decoded.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      message: 'Page created successfully',
      page: newPage
    });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { message: 'Failed to create page' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
