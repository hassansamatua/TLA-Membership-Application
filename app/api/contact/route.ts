import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import nodemailer from 'nodemailer';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: Request) {
  let connection;
  try {
    const formData: ContactFormData = await request.json();
    
    // Validate required fields
    const { name, email, subject, message } = formData;
    
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    connection = await pool.getConnection();
    
    // Store contact submission in database
    const [result] = await connection.query(
      `INSERT INTO contact_submissions (name, email, subject, message, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [name, email, subject, message]
    );
    
    // Send email notification
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: 'info@tla.or.tz', // Admin email
        subject: `New Contact Form Submission: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><small>This message was sent from the Tanzania Library Association contact form.</small></p>
        `,
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Contact form email sent successfully');
    } catch (emailError) {
      console.error('Error sending contact email:', emailError);
      // Don't fail the request if email fails, just log it
    }
    
    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.',
      submissionId: (result as any).insertId
    });
    
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
