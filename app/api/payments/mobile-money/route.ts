import { NextRequest, NextResponse } from 'next/server';
import { mobileMoneyService } from '@/lib/mobile-money';
import { getUserById } from '@/lib/auth';
import { updateMembershipPayment } from '@/lib/membership';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { membershipType, amount, userId, paymentMethod, phoneNumber, customerName } = body;

    if (!membershipType || !amount || !userId || !paymentMethod || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: membershipType, amount, userId, paymentMethod, phoneNumber' },
        { status: 400 }
      );
    }

    // Validate phone number for the selected provider
    if (!mobileMoneyService.validatePhoneNumber(phoneNumber, paymentMethod)) {
      return NextResponse.json(
        { error: `Invalid ${paymentMethod} phone number format` },
        { status: 400 }
      );
    }

    // Get user details
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate unique order ID
    const orderId = `TLA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record first
    const { pool } = await import('@/lib/db');
    const connection = await pool.getConnection();
    
    try {
      await connection.query(
        `INSERT INTO payments (reference, user_id, membership_type, amount, currency, status, payment_method, phone_number, created_at)
         VALUES (?, ?, ?, ?, 'TZS', 'pending', ?, ?, NOW())`,
        [orderId, userId, membershipType, amount, paymentMethod, phoneNumber]
      );
      
      console.log('Mobile money payment record created successfully');
      
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      
      // If table doesn't exist, create it
      if (dbError.code === 'ER_NO_SUCH_TABLE') {
        console.log('Creating payments table...');
        try {
          await connection.query(`
            CREATE TABLE payments (
              id INT AUTO_INCREMENT PRIMARY KEY,
              reference VARCHAR(100) UNIQUE NOT NULL,
              user_id INT NOT NULL,
              membership_type VARCHAR(50) NOT NULL,
              amount DECIMAL(10,2) NOT NULL,
              currency VARCHAR(3) DEFAULT 'TZS',
              status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
              payment_method VARCHAR(50),
              phone_number VARCHAR(20),
              transaction_id VARCHAR(100),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              paid_at TIMESTAMP NULL DEFAULT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              INDEX idx_user_id (user_id),
              INDEX idx_reference (reference),
              INDEX idx_status (status),
              INDEX idx_created_at (created_at)
            )
          `);
          
          // Try inserting again
          await connection.query(
            `INSERT INTO payments (reference, user_id, membership_type, amount, currency, status, payment_method, phone_number, created_at)
             VALUES (?, ?, ?, ?, 'TZS', 'pending', ?, ?, NOW())`,
            [orderId, userId, membershipType, amount, paymentMethod, phoneNumber]
          );
        } catch (createError) {
          console.error('Failed to create table:', createError);
          throw new Error('Database setup failed. Please contact administrator.');
        }
      } else {
        throw dbError;
      }
    } finally {
      connection.release();
    }

    // Initiate direct mobile money payment
    try {
      const paymentResponse = await mobileMoneyService.initiatePayment({
        provider: paymentMethod,
        phoneNumber: mobileMoneyService.formatPhoneNumber(phoneNumber, paymentMethod),
        amount,
        reference: orderId,
        customerName: customerName || user.name || 'Customer'
      });

      if (paymentResponse.success) {
        // Update payment record with transaction ID
        const connection2 = await pool.getConnection();
        try {
          await connection2.query(
            'UPDATE payments SET transaction_id = ? WHERE reference = ?',
            [paymentResponse.transactionId, orderId]
          );
        } finally {
          connection2.release();
        }

        return NextResponse.json({
          success: true,
          transactionId: paymentResponse.transactionId,
          reference: orderId,
          provider: paymentMethod,
          phoneNumber,
          amount,
          currency: 'TZS',
          message: paymentResponse.message,
          status: paymentResponse.status,
          ussdCode: mobileMoneyService.getUSSDCode(paymentMethod)
        });
      } else {
        throw new Error(paymentResponse.message);
      }

    } catch (mobileMoneyError) {
      console.error('Mobile money payment failed:', mobileMoneyError);
      
      // Update payment status to failed
      const connection2 = await pool.getConnection();
      try {
        await connection2.query(
          'UPDATE payments SET status = ? WHERE reference = ?',
          ['failed', orderId]
        );
      } finally {
        connection2.release();
      }
      
      return NextResponse.json({
        success: false,
        error: 'Mobile money payment failed. Please try again or contact support.',
        reference: orderId,
        amount,
        currency: 'TZS',
        paymentInstructions: {
          message: 'Please contact TLA office to complete payment',
          phone: '+255 22 211 3456',
          email: 'membership@tla.or.tz',
          reference: orderId,
        }
      });
    }

  } catch (error) {
    console.error('Mobile money checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create mobile money payment' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get('reference');
  const provider = searchParams.get('provider');

  if (!reference || !provider) {
    return NextResponse.json(
      { error: 'Reference and provider parameters are required' },
      { status: 400 }
    );
  }

  try {
    const paymentStatus = await mobileMoneyService.checkPaymentStatus(provider, reference);
    
    if (paymentStatus.success && paymentStatus.status === 'completed') {
      // Update membership status in database
      await updateMembershipPayment({
        reference,
        transactionId: paymentStatus.transactionId,
        amount: 0, // We'll get this from the payment record
        paymentMethod: provider,
        status: 'completed',
        paidAt: new Date(),
      });
    }
    
    return NextResponse.json({
      success: true,
      status: paymentStatus,
    });
  } catch (error) {
    console.error('Mobile money status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check mobile money payment status' },
      { status: 500 }
    );
  }
}
