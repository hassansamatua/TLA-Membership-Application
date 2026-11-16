import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { verifyToken } from '@/lib/auth';
import { evpaySandboxEnabled } from '@/lib/api-access';
import { evpayService } from '@/lib/evpay';
import { pool } from '@/lib/db';
import { listFutureUnpaidCycles } from '@/lib/enhancedMembershipCycles';

async function authToken(request: Request) {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
  if (!evpaySandboxEnabled()) {
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
      'SELECT id,email,name,membership_type,is_approved FROM users WHERE id=? LIMIT 1',
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
    if (!Number.isFinite(amount) || amount < 100) {
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

    let checkout;
    try {
      checkout = await evpayService.createUssdPayment({
        paymentMethod,
        amount,
        product: `ZaLIKA membership ${membershipType} cycle ${cycleYear}`,
        payerAccountId: phoneNumber,
        requestId: reference,
        payerName: String(user.name || '').trim() || undefined,
        narrative: `ZaLIKA membership payment ${reference}`,
        callbackUrl: '',
      });
    } catch (error) {
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

    const providerReference = String(checkout.data?.transactionId || '') || null;
    await connection.query(
      'UPDATE payments SET transaction_id=?,updated_at=NOW() WHERE reference=? AND status=\'pending\'',
      [providerReference, reference]
    );

    return NextResponse.json({
      success: true,
      checkoutUrl: null,
      requiresMobileApproval: true,
      reference,
      providerReference,
      amount,
      currency: 'TZS',
      cycleYear,
      gateway: 'evpay',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment checkout failed';
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    connection.release();
  }
}
