// Email configuration for password reset
import * as nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
}

// Production email configuration using NodeMailer
export const emailConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  username: process.env.EMAIL_USER || '',
  password: process.env.EMAIL_PASS || '',
  from: process.env.EMAIL_FROM || 'hanscovd5@gmail.com'
};

export const sendPasswordResetEmail = async (email: string, resetCode: string): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: true,
      auth: {
        user: emailConfig.username,
        pass: emailConfig.password
      }
    });

    const subject = 'Password Reset Code';
    const message = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 25px; border-radius: 50%; text-align: center;">
                <h1 style="margin: 0; font-size: 32px; font-weight: bold;">Password Reset</h1>
              </div>
            </div>
            <div style="background-color: white; padding: 20px; border-radius: 8px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 20px;">Hello,</p>
              <p style="color: #666; font-size: 16px;">You requested to reset your password. Use the code below to reset your password:</p>
              <div style="background-color: #f8f9fa; border: 2px dashed #ddd; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 3px;">${resetCode}</span>
              </div>
              <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in 15 minutes.</p>
              <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 14px;">Best regards,<br>The Team</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: subject,
      html: message
    };

    // Send email using NodeMailer
    const info = await transporter.sendMail(mailOptions);
    
    console.log('=== EMAIL DEBUG ===');
    console.log('To:', email);
    console.log('Subject:', subject);
    console.log('Reset Code:', resetCode);
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('==================');

    if (info.accepted) {
      console.log('Email sent successfully to:', email);
      return true;
    } else {
      console.error('Failed to send email to:', email);
      console.error('Error:', info.error);
      return false;
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};
