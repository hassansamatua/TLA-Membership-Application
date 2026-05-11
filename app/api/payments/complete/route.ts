import { NextRequest, NextResponse } from 'next/server';
import { updateMembershipPayment } from '@/lib/membership';
import { pool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, userId } = body;

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      );
    }

    // Get payment details
    const connection = await pool.getConnection();
    let paymentDetails;
    
    try {
      const [paymentRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM payments WHERE reference = ?',
        [reference]
      );
      
      if (!paymentRows || paymentRows.length === 0) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }
      
      paymentDetails = paymentRows[0];
    } finally {
      connection.release();
    }

    // Only complete pending payments
    if (paymentDetails.status !== 'pending') {
      return NextResponse.json(
        { error: 'Payment is already completed or failed' },
        { status: 400 }
      );
    }

    // Update payment status to completed
    await updateMembershipPayment({
      reference,
      transactionId: `MANUAL-${Date.now()}`,
      amount: parseFloat(paymentDetails.amount),
      paymentMethod: 'Manual Completion',
      status: 'completed',
      paidAt: new Date(),
    });

    console.log(`Manually completed payment: ${reference} for user: ${paymentDetails.user_id}`);

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
      reference,
      amount: paymentDetails.amount,
      membershipType: paymentDetails.membership_type,
    });

  } catch (error) {
    console.error('Manual payment completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete payment' },
      { status: 500 }
    );
  }
}

// Get list of pending payments for admin
export async function GET(request: NextRequest) {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [paymentRows] = await connection.query<RowDataPacket[]>(`
        SELECT p.*, u.name, u.email 
        FROM payments p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.status = 'pending' 
        ORDER BY p.created_at DESC
      `);
      
      return NextResponse.json({
        success: true,
        payments: paymentRows
      });
      
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending payments' },
      { status: 500 }
    );
  }
}
