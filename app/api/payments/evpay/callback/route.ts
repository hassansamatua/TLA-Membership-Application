import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { evpaySandboxEnabled } from '@/lib/api-access';
import { evpayService } from '@/lib/evpay';
import { pool } from '@/lib/db';
import { updateMembershipPayment } from '@/lib/membership';

// Our stored payment_method -> acceptable EvPay network/channel names (lowercase)
const OPERATOR_ALIASES: Record<string, string[]> = {
  mpesa: ['mpesa', 'vodacom', 'm-pesa'],
  halopesa: ['halopesa', 'halotel', 'halo'],
  airtelmoney: ['airtel', 'airtelmoney', 'airtel_money'],
  tigopesa: ['tigo', 'tigopesa', 'mixxbyyas', 'mixx'],
};

export async function POST(request: NextRequest) {
  if (!evpaySandboxEnabled()) {
    return NextResponse.json({ error: 'Operation unavailable during security containment' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!evpayService.verifyWebhookSignature(request.headers.get('x-evpay-signature'), rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { data?: Record<string, unknown>; event?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 });
  }
  const data = body.data && typeof body.data === 'object' ? body.data : {};

  const localReference = String(data.orderReference || data.requestId || data.reference || '');
  const providerReference = String(data.fspReference || data.transactionId || data.transRef || data.mnoRef || '');
  const status = String(data.status || '').toUpperCase();
  const amount = Number(data.amount);
  const msisdn = String(data.payerAccountId || data.msisdn || '').replace(/\D/g, '');
  const operator = String(data.network || data.channel || data.fsOperator || '').toLowerCase();

  if (!localReference || !status) {
    return NextResponse.json({ error: 'Missing required callback fields' }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    const [payments] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM payments WHERE reference=? LIMIT 1',
      [localReference]
    );
    const payment = payments[0];
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    if (payment.status !== 'pending') {
      return NextResponse.json({ success: true, status: payment.status, reference: payment.reference, idempotent: true });
    }

    const expectedOperator = String(payment.payment_method || '').toLowerCase();
    const aliases = OPERATOR_ALIASES[expectedOperator] || [expectedOperator];
    const operatorMatches = !operator || aliases.some(a => operator.includes(a));
    const phoneMatches = !msisdn || msisdn === String(payment.phone_number || '');
    const amountMatches = !Number.isFinite(amount) || Number(payment.amount) === amount;
    if (!amountMatches || !operatorMatches || !phoneMatches) {
      return NextResponse.json({ error: 'Callback payment identity mismatch' }, { status: 409 });
    }

    if (status === 'SUCCESS' || status === 'SETTLED') {
      await updateMembershipPayment({
        reference: payment.reference,
        transactionId: providerReference || String(payment.transaction_id || ''),
        amount: Number(payment.amount),
        paymentMethod: payment.payment_method || 'evpay',
        status: 'completed',
        paidAt: new Date(),
      });
      return NextResponse.json({ status: 'OK' });
    }

    if (status === 'FAILED' || status === 'REVERSED' || status === 'REFUNDED') {
      await connection.query(
        "UPDATE payments SET status='failed',transaction_id=COALESCE(?,transaction_id),updated_at=NOW() WHERE reference=? AND status='pending'",
        [providerReference || null, payment.reference]
      );
      return NextResponse.json({ status: 'OK' });
    }

    // PENDING / PROCESSING / ON-HOLD — acknowledge but leave pending
    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Callback processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection.release();
  }
}
