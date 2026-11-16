import { NextResponse } from 'next/server';
import { azampaySandboxEnabled } from '@/lib/api-access';

export async function GET() {
  return NextResponse.json({ enabled: azampaySandboxEnabled(), sandbox: process.env.AZAMPAY_ENVIRONMENT === 'sandbox' });
}
