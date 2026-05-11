/**
 * Debug Email Testing Endpoint
 * Use this to verify email configuration is working
 * POST /api/debug/send-test-email
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmailNotification } from '@/lib/notificationService';

async function handleEmailTest(request: NextRequest) {
  try {
    // Log environment variables
    console.log('[DEBUG-EMAIL] Environment check:');
    console.log('- EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('- EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('- EMAIL_USER:', process.env.EMAIL_USER);
    console.log('- EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
    console.log('- EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD?.length);
    console.log('- EMAIL_SECURE:', process.env.EMAIL_SECURE);

    let email = 'test@example.com';
    let userName = 'Test User';

    // For POST requests, parse JSON body
    if (request.method === 'POST') {
      const body = await request.json();
      email = body.email || email;
      userName = body.userName || userName;
    } else {
      // For GET requests, check query parameters
      const searchParams = new URL(request.url).searchParams;
      email = searchParams.get('email') || email;
      userName = searchParams.get('userName') || userName;
    }

    console.log('[DEBUG-EMAIL] Attempting to send test email to:', email);

    const htmlContent = `
      <h2>Test Email from Tanzania Library Association</h2>
      <p>Hello ${userName},</p>
      <p>This is a test email to verify that email notifications are working correctly.</p>
      <p>If you received this email, the email configuration is working!</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `;

    const textContent = `
Test Email from Tanzania Library Association

Hello ${userName},

This is a test email to verify that email notifications are working correctly.
If you received this email, the email configuration is working!

Timestamp: ${new Date().toISOString()}
    `;

    const success = await sendEmailNotification(
      email,
      'Test Email - Configuration Verification',
      htmlContent,
      textContent
    );

    console.log('[DEBUG-EMAIL] Email send result:', success);

    return NextResponse.json({
      success,
      message: success ? 'Email sent successfully' : 'Email send failed',
      config: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        secure: process.env.EMAIL_SECURE,
        passwordConfigured: !!process.env.EMAIL_PASSWORD,
      },
      recipient: email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DEBUG-EMAIL] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleEmailTest(request);
}

export async function POST(request: NextRequest) {
  return handleEmailTest(request);
}
