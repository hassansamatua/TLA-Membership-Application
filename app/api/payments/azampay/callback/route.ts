import { NextRequest, NextResponse } from 'next/server';
import { azampayService } from '@/lib/azampay';
import { updateMembershipPayment } from '@/lib/membership';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-azampay-signature') || '';

    // Verify webhook signature (skip for sandbox)
    if (process.env.NODE_ENV === 'production') {
      const isValid = azampayService.verifyWebhookSignature(
        JSON.stringify(body),
        signature
      );
      
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const { reference, status, amount, transactionId, paymentMethod } = body;

    if (!reference || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get payment status from AzamPay to verify
    const paymentStatus = await azampayService.checkPaymentStatus(reference);

    if (paymentStatus.data.status === 'SUCCESS') {
      // Update membership status in database
      await updateMembershipPayment({
        reference,
        transactionId: paymentStatus.data.transactionId || transactionId,
        amount: parseFloat(paymentStatus.data.amount),
        paymentMethod: paymentMethod || 'unknown',
        status: 'completed',
        paidAt: new Date(),
      });

      // Log successful payment
      console.log(`Payment successful: ${reference} - Amount: ${paymentStatus.data.amount} TZS`);

      return NextResponse.json({ 
        success: true, 
        status: 'completed',
        reference,
        transactionId: paymentStatus.data.transactionId,
      });
    } else if (paymentStatus.data.status === 'FAILED') {
      // Update payment status as failed
      await updateMembershipPayment({
        reference,
        transactionId: paymentStatus.data.transactionId || transactionId,
        amount: parseFloat(paymentStatus.data.amount),
        paymentMethod: paymentMethod || 'unknown',
        status: 'failed',
        paidAt: new Date(),
      });

      console.log(`Payment failed: ${reference}`);

      return NextResponse.json({ 
        success: false, 
        status: 'failed',
        reference,
      });
    } else {
      // Payment still pending
      return NextResponse.json({ 
        success: false, 
        status: 'pending',
        reference,
      });
    }

  } catch (error) {
    console.error('AzamPay callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'AzamPay callback endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}
