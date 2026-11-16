import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { azampaySandboxEnabled } from '@/lib/api-access';
import { azampayService } from '@/lib/azampay';
import { pool } from '@/lib/db';
import { updateMembershipPayment } from '@/lib/membership';

export async function POST(request: NextRequest) {
  if (!azampaySandboxEnabled()) {
    return NextResponse.json({ error: 'Operation unavailable during security containment' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 });
  }

  const hasSignature = Boolean(body.signature);
  if (hasSignature && !(await azampayService.verifyWebhookPayload(body))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  if (!hasSignature && process.env.AZAMPAY_ENVIRONMENT !== 'sandbox') {
    return NextResponse.json({ error: 'Missing callback signature' }, { status: 401 });
  }

  const localReference = String(body.utilityref || '');
  const providerReference = String(
    body.externalreference || body.transid || body.mnoreference || body.reference || ''
  );
  const transactionStatus = String(body.transactionstatus || '').toLowerCase();
  const amount = Number(body.amount);
  const msisdn = String(body.msisdn || '').replace(/\D/g, '');
  const operator = String(body.operator || '').toLowerCase();

  if (!localReference || !transactionStatus || !providerReference || !Number.isFinite(amount)) {
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

    const expectedProvider = String(payment.payment_method || '').toLowerCase();
    const providerMatches = !expectedProvider
      || operator === 'halopesa' && expectedProvider === 'halopesa'
      || operator === 'mpesa' && expectedProvider === 'mpesa'
      || operator === 'airtel' && expectedProvider === 'airtelmoney'
      || operator === 'tigo' && ['tigopesa', 'mixxbyyas'].includes(expectedProvider)
      || operator === 'azampesa' && expectedProvider === 'azampesa';
    const phoneMatches = !msisdn || msisdn === String(payment.phone_number || '');
    if (Number(payment.amount) !== amount || !providerMatches || !phoneMatches) {
      return NextResponse.json({ error: 'Callback payment identity mismatch' }, { status: 409 });
    }

    if (transactionStatus === 'success') {
      await updateMembershipPayment({
        reference: payment.reference,
        transactionId: providerReference,
        amount: Number(payment.amount),
        paymentMethod: payment.payment_method || 'azampay',
        status: 'completed',
        paidAt: new Date(),
      });
      return NextResponse.json({ success: true, status: 'completed', reference: payment.reference });
    }

    await connection.query(
      "UPDATE payments SET status='failed',transaction_id=?,updated_at=NOW() WHERE reference=? AND status='pending'",
      [providerReference, payment.reference]
    );
    return NextResponse.json({ success: true, status: 'failed', reference: payment.reference });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Callback processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection.release();
  }
}
