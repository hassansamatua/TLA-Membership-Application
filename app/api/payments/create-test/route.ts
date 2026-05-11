import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  const { reference } = await request.json();
  
  if (!reference) {
    return NextResponse.json(
      { error: 'Reference is required' },
      { status: 400 }
    );
  }

  // Get the authenticated user from the session
  console.log('Creating test payment with reference:', reference);
  
  // Get token from headers or cookies
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value || null;
    } catch (cookieError) {
      console.error('Error accessing cookies:', cookieError);
    }
  }
  
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Verify the token and get user ID
  const decoded = verifyToken(token);
  
  if (!decoded?.id) {
    return NextResponse.json(
      { error: 'Invalid user' },
      { status: 401 }
    );
  }

  const userId = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;
  
  // Default test payment details
  const testPayment = {
    reference,
    amount: 40000, // Default test amount
    currency: 'TZS',
    status: 'completed', // Changed from 'pending' to 'completed' for test payments
    payment_method: 'test',
    user_id: userId,
    membership_type: 'regular', // Changed from 'personal' to 'regular' to match new membership types
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };
  
  console.log('Test payment details:', JSON.stringify(testPayment, null, 2));

  try {
    const connection = await pool.getConnection();
    
    try {
      // Check if payment already exists
      console.log('Checking for existing payment with reference:', reference);
      const [existingPayments] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM payments WHERE reference = ?',
        [reference]
      );

      if (existingPayments && existingPayments.length > 0) {
        console.log('Payment already exists:', existingPayments[0]);
        // Payment already exists, return success
        return NextResponse.json({
          success: true,
          message: 'Test payment already exists',
          data: { reference }
        });
      }

      // Create test payment
      console.log('Creating new test payment...');
      const [result] = await connection.query(
        `INSERT INTO payments 
         (reference, amount, currency, status, payment_method, user_id, membership_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testPayment.reference,
          testPayment.amount,
          testPayment.currency,
          testPayment.status,
          testPayment.payment_method,
          testPayment.user_id,
          testPayment.membership_type,
          testPayment.created_at,
          testPayment.updated_at
        ]
      );
      
      console.log('Test payment created successfully:', result);

      return NextResponse.json({
        success: true,
        message: 'Test payment created successfully',
        data: { reference }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating test payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
