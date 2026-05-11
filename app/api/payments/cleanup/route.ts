import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  let connection;
  try {
    const body = await request.json();
    const { action } = body;

    connection = await pool.getConnection();

    if (action === 'cleanup-test-payments') {
      // Delete all test payments and their associated records
      await connection.query('DELETE FROM payments WHERE reference LIKE "TEST-%"');
      
      // Also clean up any memberships that were created from test payments
      await connection.query(`
        DELETE FROM memberships 
        WHERE user_id IN (
          SELECT DISTINCT user_id FROM payments WHERE reference LIKE "TEST-%"
        )
      `);

      return NextResponse.json({
        success: true,
        message: 'Test payments cleaned up successfully',
        deletedCount: 0 // We could return the actual count if needed
      });
    }

    if (action === 'update-pending-test-payments') {
      // Update all pending test payments to completed
      const [result] = await connection.query(`
        UPDATE payments 
        SET status = 'completed', 
            paid_at = NOW(),
            payment_method = 'Test Payment',
            transaction_id = CONCAT('TEST-TXN-', id)
        WHERE reference LIKE 'TEST-%' AND status = 'pending'
      `);

      // Update corresponding memberships
      await connection.query(`
        UPDATE memberships m
        INNER JOIN payments p ON m.user_id = p.user_id
        SET m.status = 'active',
            m.payment_status = 'paid',
            m.payment_date = CURDATE(),
            m.updated_at = NOW()
        WHERE p.reference LIKE 'TEST-%' AND p.status = 'completed'
      `);

      return NextResponse.json({
        success: true,
        message: 'Pending test payments updated to completed',
        updatedCount: (result as any).affectedRows
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Payment cleanup error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cleanup payments'
    }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function GET(request: Request) {
  let connection;
  try {
    connection = await pool.getConnection();

    // Get all test payments
    const [testPayments] = await connection.query(`
      SELECT p.*, u.name, u.email 
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.reference LIKE 'TEST-%'
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      payments: testPayments,
      count: (testPayments as any[]).length
    });

  } catch (error) {
    console.error('Error fetching test payments:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch test payments'
    }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
