import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export async function POST(request: Request) {
  let connection;
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'ensure-admin') {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Check if admin user exists
    const [adminCheck] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM users WHERE is_admin = 1'
    );
    
    const adminCount = (adminCheck as any)[0].count;

    if (adminCount === 0) {
      // Create admin user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.query(
        'INSERT INTO users (name, email, password, is_admin, is_approved) VALUES (?, ?, ?, ?, ?)',
        ['Admin User', 'admin@tla.or.tz', hashedPassword, 1, 1]
      );
      
      const adminId = (await connection.query('SELECT LAST_INSERT_ID() as id')) as any;
      
      console.log('Admin user created with ID:', adminId[0].id);
      
      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        adminId: adminId[0].id,
        credentials: {
          email: 'admin@tla.or.tz',
          password: 'admin123'
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Admin user already exists',
        adminCount: adminCount
      });
    }

  } catch (error) {
    console.error('Error ensuring admin user:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to ensure admin user',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
