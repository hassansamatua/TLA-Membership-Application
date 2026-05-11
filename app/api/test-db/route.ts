import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  let connection;
  
  try {
    console.log('[Test-DB] Starting database test...');
    
    // Get database connection
    connection = await pool.getConnection();
    console.log('[Test-DB] Database connection established');
    
    // Test basic query
    const [rows] = await connection.query('SELECT 1 as test, NOW() as current_time');
    console.log('[Test-DB] Basic query successful:', rows);
    
    // Test payment lookup
    const [payments] = await connection.query(
      'SELECT id, user_id, reference FROM payments WHERE reference LIKE ? LIMIT 3',
      ['TEST-%']
    );
    console.log('[Test-DB] Payment lookup successful:', payments);
    
    // Test transaction
    await connection.beginTransaction();
    const [count] = await connection.query('SELECT COUNT(*) as user_count FROM users');
    await connection.commit();
    console.log('[Test-DB] Transaction successful:', count);
    
    return NextResponse.json({
      success: true,
      message: 'Database test successful',
      data: {
        basicQuery: rows,
        payments: payments,
        userCount: count
      }
    });
    
  } catch (error) {
    console.error('[Test-DB] Error:', error);
    
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[Test-DB] Rollback error:', rollbackError);
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
    
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log('[Test-DB] Connection released');
      } catch (err) {
        console.error('[Test-DB] Error releasing connection:', err);
      }
    }
  }
}
