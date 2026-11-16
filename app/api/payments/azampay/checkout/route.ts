import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { verifyToken } from '@/lib/auth';
import { azampaySandboxEnabled } from '@/lib/api-access';
import { azampayService } from '@/lib/azampay';
import { pool } from '@/lib/db';
import { listFutureUnpaidCycles } from '@/lib/enhancedMembershipCycles';

async function authToken(request: Request) {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
  if (!azampaySandboxEnabled()) {
    return NextResponse.json({ error: 'Operation unavailable during security containment' }, { status: 503 });
  }

  const token = await authToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let userId: number;
  try {
    const decoded = verifyToken(token);
    userId = Number(decoded.id);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    cycleYear?: unknown;
    cycleYears?: unknown;
    paymentMethod?: unknown;
    phoneNumber?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payment request' }, { status: 400 });
  }

  const years = Array.isArray(body.cycleYears)
    ? body.cycleYears.map(Number)
    : [Number(body.cycleYear)];
  if (years.length !== 1 || !Number.isSafeInteger(years[0])) {
    return NextResponse.json({ error: 'Sandbox checkout supports exactly one cycle' }, { status: 400 });
  }
  const cycleYear = Number(years[0]);
  const paymentMethod = String(body.paymentMethod || '');
  const rawPhone = String(body.phoneNumber || '').replace(/\D/g, '');
  const phoneNumber = rawPhone.startsWith('255')
    ? rawPhone
    : rawPhone.startsWith('0')
      ? `255${rawPhone.slice(1)}`
      : rawPhone;
  if (!paymentMethod || !/^255\d{9}$/.test(phoneNumber)) {
    return NextResponse.json({ error: 'Payment method and a valid Tanzanian phone number are required' }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT id,email,membership_type,is_approved FROM users WHERE id=? LIMIT 1',
      [userId]
    );
    const user = users[0];
    if (!user || Number(user.is_approved) !== 1) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const quotes = await listFutureUnpaidCycles({ userId, maxFuture: 2 });
    const quote = quotes.find(cycle => cycle.cycleYear === cycleYear);
    if (!quote || quote.isPaid) {
      return NextResponse.json({ error: 'Selected cycle is not eligible for payment' }, { status: 409 });
    }

    const amount = Number(quote.totalDue);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Selected cycle is not payable' }, { status: 409 });
    }

    const membershipType = String(user.membership_type || '') === 'organization' ? 'organization' : 'personal';
    const reference = `TLA-PAY-${randomUUID()}`;
    await connection.query(
      `INSERT INTO payments
       (reference,user_id,membership_type,amount,currency,status,payment_method,phone_number,cycle_year,created_at,updated_at)
       VALUES(?,?,?,?, 'TZS','pending',?,?,?,NOW(),NOW())`,
      [reference, userId, membershipType, amount, paymentMethod, phoneNumber, cycleYear]
    );

    // Sandbox-only demo mode: skip the real AzamPay call and settle through the
    // real callback path after a short delay, so the UI shows processing -> success.
    const simulateSandboxCallback =
      process.env.AZAMPAY_ENVIRONMENT === 'sandbox'
      && process.env.AZAMPAY_SIMULATE_CALLBACK === 'true';
    if (simulateSandboxCallback) {
      const operatorMap: Record<string, string> = {
        azampesa: 'azampesa', mpesa: 'mpesa', airtelmoney: 'airtel',
        tigopesa: 'tigo', mixxbyyas: 'tigo', halopesa: 'halopesa',
      };
      const simulatedTransactionId = `SIM-${randomUUID().replace(/-/g, '').slice(0, 32)}`;
      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
      setTimeout(() => {
        fetch(`${baseUrl}/api/payments/azampay/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utilityref: reference,
            externalreference: simulatedTransactionId,
            transactionstatus: 'success',
            operator: operatorMap[paymentMethod] || paymentMethod,
            amount: amount.toString(),
            msisdn: phoneNumber,
            transid: simulatedTransactionId,
            mnoreference: simulatedTransactionId,
          }),
        }).catch(() => undefined);
      }, 4000);

      return NextResponse.json({
        success: true,
        checkoutUrl: null,
        requiresMobileApproval: true,
        reference,
        providerReference: simulatedTransactionId,
        status: 'pending',
        message: 'Simulated sandbox payment — settling automatically.',
        amount,
        currency: 'TZS',
        cycleYear,
      });
    }

    let checkout;
    try {
      checkout = await azampayService.createMembershipPayment({
        userId: String(userId),
        membershipType,
        amount,
        userEmail: String(user.email),
        userPhone: phoneNumber,
        orderId: reference,
        paymentMethod,
      });
    } catch (error) {
      // A timeout/abort means the provider may still have received the push —
      // keep the payment pending so a late provider callback can settle it.
      // Only a real provider response (rejection/error) marks it failed.
      const name = error instanceof Error ? error.name : '';
      const timedOut = name === 'TimeoutError' || name === 'AbortError';
      if (!timedOut) {
        await connection.query(
          "UPDATE payments SET status='failed',updated_at=NOW() WHERE reference=? AND status='pending'",
          [reference]
        );
      }
      if (timedOut) {
        return NextResponse.json({
          success: true,
          checkoutUrl: null,
          requiresMobileApproval: true,
          reference,
          status: 'pending',
          message: 'Provider confirmation is taking longer than usual. If you received a payment prompt, approve it — we will confirm automatically.',
          amount,
          currency: 'TZS',
          cycleYear,
        });
      }
      throw error;
    }

    const providerPayload = checkout.data && typeof checkout.data === 'object' ? checkout.data : {};
    const providerReference = String(
      providerPayload.reference
      || providerPayload.transactionId
      || providerPayload.pgReferenceId
      || providerPayload.referenceId
      || checkout.reference
      || checkout.transactionId
      || checkout.pgReferenceId
      || checkout.referenceId
      || ''
    ) || null;
    const checkoutUrl = String(providerPayload.checkoutUrl || checkout.checkoutUrl || '') || null;
    await connection.query(
      'UPDATE payments SET checkout_url=?,transaction_id=?,updated_at=NOW() WHERE reference=? AND status=\'pending\'',
      [checkoutUrl, providerReference, reference]
    );

    return NextResponse.json({
      success: true,
      checkoutUrl,
      requiresMobileApproval: !checkoutUrl,
      reference,
      providerReference,
      amount,
      currency: 'TZS',
      cycleYear,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment checkout failed';
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    connection.release();
  }
}
