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

    // Get menu items from database
    const [menuItems] = await connection.query<RowDataPacket[]>(
      'SELECT id, title, url, menu_name, parent_id, order_index, target, is_active FROM menu_items ORDER BY menu_name, order_index'
    );

    // Organize menu items into hierarchical structure
    const menuStructure: any = {};
    menuItems.forEach((item: any) => {
      if (!menuStructure[item.menu_name]) {
        menuStructure[item.menu_name] = [];
      }
      menuStructure[item.menu_name].push({
        id: item.id,
        title: item.title,
        url: item.url,
        parentId: item.parent_id,
        orderIndex: item.order_index,
        target: item.target,
        isActive: item.is_active
      });
    });

    return NextResponse.json(menuStructure);
  } catch (error) {
    console.error('Error fetching navigation:', error);
    return NextResponse.json(
      { message: 'Failed to fetch navigation' },
      { status: 500 }
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
    const { menuName, items } = body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete existing menu items for this menu
      await connection.query('DELETE FROM menu_items WHERE menu_name = ?', [menuName]);

      // Insert new menu items
      for (const item of items) {
        await connection.query(
          `INSERT INTO menu_items (title, url, menu_name, parent_id, order_index, target, is_active, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [item.title, item.url, menuName, item.parentId || null, item.orderIndex, item.target, item.isActive]
        );
      }

      await connection.commit();

      return NextResponse.json({
        message: 'Navigation updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating navigation:', error);
    return NextResponse.json(
      { message: 'Failed to update navigation' },
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
    const { title, url, menuName, parentId, orderIndex, target } = body;

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `INSERT INTO menu_items (title, url, menu_name, parent_id, order_index, target, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [title, url, menuName || 'main', parentId || null, orderIndex || 0, target || '_self']
    );

    return NextResponse.json({
      message: 'Menu item created successfully',
      itemId: (result as any).insertId
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { message: 'Failed to create menu item' },
      { status: 500 }
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'Menu item ID required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    const [result] = await connection.query('DELETE FROM menu_items WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { message: 'Failed to delete menu item' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
