/**
 * Debug Email Sending
 * Test if email notifications are working
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendApprovalNotification } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const { userId, userName, email, membershipType } = await request.json();

    console.log('=== TESTING EMAIL NOTIFICATION ===');
    console.log('Environment check:');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ SET' : '❌ NOT SET');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
    console.log('');

    console.log('Attempting to send approval notification:');
    console.log('User ID:', userId);
    console.log('User Name:', userName);
    console.log('Email:', email);
    console.log('Membership Type:', membershipType);
    console.log('');

    // Try sending approval notification
    const result = await sendApprovalNotification(userId, userName, membershipType);

    console.log('Email send result:', result);

    return NextResponse.json({
      success: true,
      message: 'Email test completed',
      emailSent: result,
      environment: {
        EMAIL_HOST: process.env.EMAIL_HOST,
        EMAIL_PORT: process.env.EMAIL_PORT,
        EMAIL_USER: process.env.EMAIL_USER,
        EMAIL_FROM: process.env.EMAIL_FROM,
        EMAIL_PASSWORD_SET: !!process.env.EMAIL_PASSWORD,
      },
    });

  } catch (error) {
    console.error('=== EMAIL TEST ERROR ===');
    console.error('Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
        message: 'Failed to send test email',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with { userId, userName, email, membershipType }',
    example: {
      userId: 9,
      userName: 'User Name',
      email: 'user@example.com',
      membershipType: 'personal',
    },
  });
}
