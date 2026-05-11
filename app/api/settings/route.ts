import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function GET() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Fetch public settings from database
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value FROM site_settings WHERE is_public = 1 ORDER BY setting_key'
    );
    
    // Convert to key-value object
    const settings: Record<string, any> = {};
    rows.forEach((row) => {
      try {
        // Try to parse JSON values
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        // If not JSON, use as string
        settings[row.setting_key] = row.setting_value;
      }
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({}, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
