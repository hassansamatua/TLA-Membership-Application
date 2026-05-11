import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Fetch contact content from database
    const [rows] = await connection.query(
      'SELECT id, section_key, section_type, content, order_index, is_active FROM contact_content WHERE is_active = 1 ORDER BY order_index'
    );
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching contact content:', error);
    return NextResponse.json([], { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
