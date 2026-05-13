import { NextRequest, NextResponse } from 'next/server';
import { azampayService } from '@/lib/azampay';
import { getUserById } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      membershipType,
      amount,
      userId,
      paymentMethod,
      phoneNumber,
      customerName,
      customerEmail,
      // New multi-cycle fields from the redesigned checkout. Both are
      // optional so legacy callers (single-cycle current payment) keep
      // working. cycleCount is hard-capped at 3 per business rules.
      targetCycleYear: rawTargetCycle,
      cycleCount: rawCycleCount,
    } = body;

    if (!membershipType || !amount || !userId || !paymentMethod || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: membershipType, amount, userId, paymentMethod, phoneNumber' },
        { status: 400 }
      );
    }

    const targetCycleYear = Number.isFinite(Number(rawTargetCycle))
      ? Number(rawTargetCycle)
      : null;
    const cycleCount = Math.min(
      3,
      Math.max(1, Number.isFinite(Number(rawCycleCount)) ? Number(rawCycleCount) : 1)
    );

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

    // Extract phone number from user profile
    let userPhone = '+255000000000'; // Default fallback
    if (user.profile) {
      const profile = user.profile as any;
      userPhone = profile.phone || 
                  JSON.parse(profile.contact_info || '{}')?.phone || 
                  '+255000000000';
    }

    // Try AzamPay checkout FIRST to get the reference
    let checkoutResponse;
    try {
      checkoutResponse = await azampayService.createMembershipPayment({
        userId,
        membershipType,
        amount,
        userEmail: customerEmail || user.email,
        userPhone: phoneNumber,
        orderId,
        paymentMethod, // Pass the selected mobile money provider
      });
    } catch (checkoutError: any) {
      console.error('AzamPay checkout error:', checkoutError);
      console.error('AzamPay checkout error details:', {
        message: checkoutError?.message || 'Unknown error',
        stack: checkoutError?.stack
      });
      return NextResponse.json(
        { 
          error: checkoutError?.message || 'Failed to create payment checkout',
          details: process.env.NODE_ENV === 'development' ? {
            originalError: checkoutError?.message,
            stack: checkoutError?.stack
          } : undefined
        },
        { status: 500 }
      );
    }

    // Now create payment record with the checkout reference
    const paymentReference = checkoutResponse.data.reference;
    const { pool } = await import('@/lib/db');
    const connection = await pool.getConnection();
    
    try {
      // Create payment record with the checkout reference
      await connection.query(
        `INSERT INTO payments
           (reference, user_id, membership_type, amount, currency, status,
            payment_method, phone_number, checkout_url,
            cycle_year, target_cycle_year, cycle_count, created_at)
         VALUES (?, ?, ?, ?, 'TZS', 'pending', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          paymentReference, userId, membershipType, amount,
          paymentMethod, phoneNumber, checkoutResponse.data.checkoutUrl,
          targetCycleYear, targetCycleYear, cycleCount,
        ]
      );
      
      console.log('Payment record created with reference:', paymentReference, '(cycles:', cycleCount, 'starting', targetCycleYear, ')');
      
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      
      // If table doesn't exist, create it with phone_number column
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
              checkout_url TEXT,
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
          
          // Try inserting again with the new cycle metadata
          await connection.query(
            `INSERT INTO payments
               (reference, user_id, membership_type, amount, currency, status,
                payment_method, phone_number, checkout_url,
                cycle_year, target_cycle_year, cycle_count, created_at)
             VALUES (?, ?, ?, ?, 'TZS', 'pending', ?, ?, ?, ?, ?, ?, NOW())`,
            [
              paymentReference, userId, membershipType, amount,
              paymentMethod, phoneNumber, checkoutResponse.data.checkoutUrl,
              targetCycleYear, targetCycleYear, cycleCount,
            ]
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

    // If in test mode, immediately complete the payment
    if (checkoutResponse.data.reference.startsWith('TEST-')) {
      console.log('Test mode detected: Immediately completing payment');
      
      // Update payment status to completed
      const { updateMembershipPayment } = await import('@/lib/membership');
      console.log('Updating membership payment with:', {
        reference: paymentReference,
        transactionId: checkoutResponse.data.transactionId,
        amount,
        paymentMethod: 'Test Payment',
        status: 'completed',
        paidAt: new Date(),
      });
      await updateMembershipPayment({
        reference: paymentReference,
        transactionId: checkoutResponse.data.transactionId,
        amount,
        paymentMethod: 'Test Payment',
        status: 'completed',
        paidAt: new Date(),
      });
      console.log('Membership payment updated successfully');

      return NextResponse.json({
        success: true,
        checkoutUrl: checkoutResponse.data.checkoutUrl,
        reference: checkoutResponse.data.reference,
        transactionId: checkoutResponse.data.transactionId,
        orderId,
        amount,
        currency: 'TZS',
        testMode: true,
        immediatelyCompleted: true,
      });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResponse.data.checkoutUrl,
      reference: checkoutResponse.data.reference,
      transactionId: checkoutResponse.data.transactionId,
      orderId,
      amount,
      currency: 'TZS',
    });

  } catch (error) {
    console.error('Payment checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment checkout' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.json(
      { error: 'Reference parameter is required' },
      { status: 400 }
    );
  }

  try {
    const paymentStatus = await azampayService.checkPaymentStatus(reference);
    
    return NextResponse.json({
      success: true,
      status: paymentStatus,
    });
  } catch (error) {
    console.error('AzamPay status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
