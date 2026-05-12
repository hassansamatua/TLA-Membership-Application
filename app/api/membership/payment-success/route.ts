import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getAuthToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
  console.log('=== PAYMENT SUCCESS API START ===');
  console.log('Payment success API called');

  let connection;
  try {
    const token = await getAuthToken(request);
    console.log('Token found:', !!token);
    
    if (!token) {
      console.log('No token found, returning 401');
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    console.log('Token decoded:', decoded);
    
    if (!decoded?.id) {
      console.log('Invalid token, returning 401');
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    console.log('User ID from token:', decoded.id);

    const body = await request.json();
    const { paymentReference } = body;

    console.log('Payment reference from body:', paymentReference);

    if (!paymentReference) {
      console.log('No payment reference found, returning 400');
      return NextResponse.json({ success: false, message: 'Payment reference is required' }, { status: 400 });
    }

    console.log('Getting database connection...');
    connection = await pool.getConnection();
    console.log('Database connection established');
    
    // Test database connection
    try {
      const [testResult] = await connection.query('SELECT 1 as test_value');
      console.log('Database connection test result:', testResult);
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
    }

    // Find the payment record - using LIKE to handle potential URL-encoded characters
    console.log('=== PAYMENT SEARCH DEBUG ===');
    console.log('Searching for payment with reference:', paymentReference);
    console.log('User ID from token:', decoded.id);
    console.log('Payment reference type:', typeof paymentReference);
    console.log('Payment reference length:', paymentReference.length);
    
    // First, let's check if payments table exists and has data
    try {
      const [tableCheck] = await connection.query('SHOW TABLES LIKE "payments"');
      console.log('Payments table exists:', tableCheck.length > 0);
      
      if (tableCheck.length > 0) {
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM payments');
        console.log('Total payments in database:', countResult[0].total);
        
        const [userPayments] = await connection.query('SELECT COUNT(*) as user_total FROM payments WHERE user_id = ?', [decoded.id]);
        console.log('Payments for this user:', userPayments[0].user_total);
      }
    } catch (tableError) {
      console.error('Error checking payments table:', tableError);
    }
    
    const [paymentRows] = await connection.query(
      'SELECT * FROM payments WHERE (reference = ? OR reference LIKE ?) AND user_id = ?',
      [paymentReference, `%${paymentReference}%`, decoded.id]
    ) as any[];

    console.log('Payment query result:', {
      rowCount: paymentRows.length,
      rows: paymentRows
    });
    
    // If no exact match, try a broader search
    if (paymentRows.length === 0) {
      console.log('No exact match found, trying broader search...');
      const [broadRows] = await connection.query(
        'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
        [decoded.id]
      ) as any[];
      console.log('Recent payments for this user:', broadRows);
    }

    if (!paymentRows.length) {
      console.error('Payment not found with reference:', paymentReference);
      console.error('Available payments for this user:');
      // Debug: Show all payments for this user
      const [allPayments] = await connection.query(
        'SELECT reference, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
        [decoded.id]
      ) as any[];
      console.log('All user payments:', allPayments);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Payment not found',
          details: `No payment found with reference: ${paymentReference} for user: ${decoded.id}. Available payments: ${JSON.stringify(allPayments, null, 2)}`
        },
        { status: 400 }
      );
    }

    // Start transaction to ensure data consistency
    await connection.beginTransaction();
    console.log('Transaction started for payment processing');

    try {
      const paymentId = paymentRows[0]?.id;
      if (!paymentId) {
        throw new Error('Payment record not found');
      }

      // 1. Update payment status to completed
      const [updateResult] = await connection.query(
        `UPDATE payments 
         SET status = 'completed', 
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [paymentId, decoded.id]
      ) as any;

      // 2. Update or create membership record with proper expiry_date handling
      await connection.query(
        `INSERT INTO memberships 
         (user_id, status, payment_status, payment_date, expiry_date, created_at, updated_at)
         VALUES (?, 'active', 'paid', NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           status = 'active',
           payment_status = 'paid',
           payment_date = NOW(),
           expiry_date = CASE 
             WHEN expiry_date IS NULL OR expiry_date < NOW() 
             THEN DATE_ADD(NOW(), INTERVAL 1 YEAR)
             ELSE expiry_date
           END,
           updated_at = NOW()`,
        [decoded.id]
      );

      // Commit transaction
      await connection.commit();

      // Update user_profiles outside of transaction to avoid deadlock
      try {
        await connection.query(
          'UPDATE user_profiles SET updated_at = NOW() WHERE user_id = ?',
          [decoded.id]
        );
      } catch (profileError) {
        console.warn('Failed to update user_profiles:', profileError);
        // Don't fail the whole operation if profile update fails
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payment processed successfully' 
      });

    } catch (error) {
      // Rollback in case of error
      await connection.rollback();
      console.error('Error in payment success transaction:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to process payment',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Payment success API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Always release connection
    if (connection) {
      connection.release();
    }
  }
}
