// app/api/send-approval-email/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const { email, name, membershipNumber } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

   // Update the email template in send-approval-email/route.ts
const { data, error } = await resend.emails.send({
  from: 'Your App <onboarding@resend.dev>',
  to: email,
  subject: 'Your Account Has Been Approved!',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #111827; font-size: 24px; margin-bottom: 20px;">
        Welcome to Our Platform, ${name}!
      </h1>
      
      <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
        Your account has been approved by our team. You can now log in and start using all the features of our platform.
      </p>

      ${membershipNumber ? `
      <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-weight: 500; color: #111827;">Your Membership Number:</p>
        <p style="font-size: 24px; font-weight: 700; color: #10B981; margin: 8px 0 0 0;">${membershipNumber}</p>
        <p style="font-size: 14px; color: #6B7280; margin: 4px 0 0 0;">Please keep this number safe for future reference.</p>
      </div>
      ` : ''}
      
      <div style="margin: 30px 0;">
        <a 
          href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login" 
          style="
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #10B981; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px;
            font-weight: 500;
            font-size: 16px;
          "
        >
          Log In Now
        </a>
      </div>
      
      <p style="color: #6B7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 20px;">
        If you have any questions, please contact our support team.
        <br><br>
        Best regards,<br>
        The Team
      </p>
    </div>
  `,
});

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to send approval email:', error);
    return NextResponse.json(
      { error: 'Failed to send approval email' }, 
      { status: 500 }
    );
  }
}