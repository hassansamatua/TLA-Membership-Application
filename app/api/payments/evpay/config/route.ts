import { NextResponse } from 'next/server';
import { evpaySandboxEnabled } from '@/lib/api-access';

export async function GET() {
  return NextResponse.json({ enabled: evpaySandboxEnabled(), sandbox: process.env.EVPAY_ENVIRONMENT === 'sandbox' });
}
