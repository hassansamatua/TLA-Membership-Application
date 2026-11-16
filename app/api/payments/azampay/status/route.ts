import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { verifyToken } from '@/lib/auth';
import { azampaySandboxEnabled } from '@/lib/api-access';
import { pool } from '@/lib/db';

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

  let reference: string;
  try {
    const body = await request.json() as { reference?: unknown };
    reference = String(body.reference || '');
  } catch {
    return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
  }
  if (!reference) return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });

  const connection = await pool.getConnection();
  try {
    const [payments] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM payments WHERE (reference=? OR transaction_id=?) AND user_id=? LIMIT 1 FOR UPDATE',
      [reference, reference, userId]
    );
    const payment = payments[0];
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.status === 'completed') return NextResponse.json({ success: true, status: 'completed', reference: payment.reference });
    if (payment.status !== 'pending') return NextResponse.json({ success: true, status: payment.status, reference: payment.reference });

    return NextResponse.json({
      success: true,
      status: 'pending',
      reference: payment.reference,
      providerReference: payment.transaction_id,
      message: 'Payment is awaiting verified provider confirmation.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment status verification failed';
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    connection.release();
  }
}
