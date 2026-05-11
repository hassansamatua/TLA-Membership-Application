import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { sendPasswordResetEmail } from '@/lib/email-simple';

// POST - Send reset code
export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, email FROM users WHERE email = ?',
      [email]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Invalidate all existing reset codes for this user before generating new one
    await connection.query(
      'UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE email = ?',
      [email]
    );

    // Generate a 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString().slice(-6);

    // Store reset code and expiry (30 minutes from now with proper timezone)
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
    const expiryTime = thirtyMinutesLater.toISOString().slice(0, 19).replace('T', ' ');
    
    console.log('=== CODE GENERATION DEBUG ===');
    console.log('Current time:', now.toISOString());
    console.log('Expiry time:', expiryTime);
    console.log('============================');

    await connection.query(
      'UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?',
      [resetCode, expiryTime, user.id]
    );

    // Send email with reset code
    const emailSent = await sendPasswordResetEmail(email, resetCode);
    
    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Password reset code sent to your email',
        resetCode: resetCode,
        expiryTime: expiryTime
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send reset code email'
      });
    }

  } catch (error: any) {
    console.error('Error in forgot password:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// POST - Verify reset code and reset password
export async function PUT(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { email, resetCode, newPassword } = await request.json();

    if (!email || !resetCode || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Email, reset code, and new password are required' },
        { status: 400 }
      );
    }

    // Find user by email and reset token (simplified like verification API)
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, email, reset_token, reset_token_expires_at FROM users WHERE email = ? AND reset_token = ? AND reset_token IS NOT NULL',
      [email, resetCode]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid reset code or email' },
        { status: 400 }
      );
    }

    const user = users[0];
    
    // Check if reset code is not expired (same logic as verification API)
    const currentTime = new Date();
    const expiresAt = new Date(user.reset_token_expires_at + 'Z'); // Ensure UTC parsing
    const isExpired = expiresAt < currentTime;
    
    if (isExpired) {
      return NextResponse.json(
        { success: false, message: 'Reset code has expired or is invalid' },
        { status: 400 }
      );
    }

    // Hash the new password
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update(newPassword, 'utf8').digest('hex');

    // Update user password
    await connection.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    // Clear any existing reset tokens for this user
    await connection.query(
      'UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE reset_token IS NOT NULL AND id = ?',
      [user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error: any) {
    console.error('Error in password reset:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
