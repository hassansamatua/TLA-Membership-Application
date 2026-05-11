import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter using your Gmail SMTP settings
const createTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('Failed to create email transporter');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Email templates
export const emailTemplates = {
  userApproved: (name: string, membershipNumber?: string) => ({
    subject: 'Your TLA Account Has Been Approved! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10B981; font-size: 28px; margin: 0;">Welcome to TLA!</h1>
            <p style="color: #6B7280; font-size: 16px; margin: 10px 0 0 0;">Tanzania Library & Information Association</p>
          </div>
          
          <h2 style="color: #111827; font-size: 24px; margin-bottom: 20px;">
            Congratulations, ${name}! 🎉
          </h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
            Your account has been <strong style="color: #10B981;">approved</strong> by the TLA administration team. 
            You now have full access to all member benefits and features.
          </p>
          
          ${membershipNumber ? `
          <div style="background-color: #F0FDF4; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #111827; font-size: 16px;">Your Membership Number:</p>
            <p style="font-size: 24px; font-weight: 700; color: #10B981; margin: 0; letter-spacing: 1px;">${membershipNumber}</p>
          </div>
          ` : ''}
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400E; font-size: 14px;">
              <strong>Important:</strong> Please keep your membership number safe as you'll need it for future reference.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a 
              href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login" 
              style="
                display: inline-block; 
                padding: 15px 30px; 
                background-color: #10B981; 
                color: white; 
                text-decoration: none; 
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
              "
            >
              Log In to Your Account
            </a>
          </div>
          
          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6B7280; font-size: 14px; margin: 0;">
              If you have any questions, please contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color: #10B981;">${process.env.EMAIL_USER}</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">
            <p>© 2026 Tanzania Library & Information Association. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  }),

  userRejected: (name: string, reason?: string) => ({
    subject: 'Regarding Your TLA Membership Application',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #EF4444; font-size: 28px; margin: 0;">TLA Membership Update</h1>
            <p style="color: #6B7280; font-size: 16px; margin: 10px 0 0 0;">Tanzania Library & Information Association</p>
          </div>
          
          <h2 style="color: #111827; font-size: 24px; margin-bottom: 20px;">
            Dear ${name},
          </h2>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
            After careful review of your application, we regret to inform you that your TLA membership application 
            has been <strong style="color: #EF4444;">not approved</strong> at this time.
          </p>
          
          ${reason ? `
          <div style="background-color: #FEF2F2; border: 2px solid #EF4444; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #111827; font-size: 16px;">Reason:</p>
            <p style="margin: 0; color: #374151; line-height: 1.5;">${reason}</p>
          </div>
          ` : `
          <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991B1B; font-size: 14px;">
              The administration team will review your application again. You may be contacted for additional information.
            </p>
          </div>
          `}
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #111827; font-size: 16px;">What happens next?</p>
            <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.6;">
              <li>You can contact us for more information about the decision</li>
              <li>You may reapply after addressing any concerns</li>
              <li>We appreciate your interest in TLA</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a 
              href="${process.env.NEXT_PUBLIC_APP_URL}/contact" 
              style="
                display: inline-block; 
                padding: 15px 30px; 
                background-color: #6B7280; 
                color: white; 
                text-decoration: none; 
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
              "
            >
              Contact Us
            </a>
          </div>
          
          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6B7280; font-size: 14px; margin: 0;">
              If you have any questions, please contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color: #10B981;">${process.env.EMAIL_USER}</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9CA3AF; font-size: 12px;">
            <p>© 2026 Tanzania Library & Information Association. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  }),
};
