import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function POST() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Update membership status for user ID 2 (HASSANI SAID SAMATUla)
    const [result] = await connection.query<RowDataPacket[]>(
      'UPDATE user_profiles SET membership_status = ?, updated_at = NOW() WHERE user_id = ?',
      ['active', 2]
    );
    
    // Verify the update
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT membership_status FROM user_profiles WHERE user_id = ?',
      [2]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Membership status updated successfully',
      updatedRows: (result as any).affectedRows,
      currentStatus: rows[0]?.membership_status
    });
  } catch (error) {
    console.error('Error fixing membership status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update membership status' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
