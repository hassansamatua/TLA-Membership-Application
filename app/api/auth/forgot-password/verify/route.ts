import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

// POST - Verify reset code
export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const { email, resetCode } = await request.json();
    
    console.log('=== VERIFICATION API DEBUG ===');
    console.log('Received email:', email);
    console.log('Received resetCode:', resetCode);
    console.log('=============================');

    if (!email || !resetCode) {
      return NextResponse.json(
        { success: false, message: 'Email and reset code are required' },
        { status: 400 }
      );
    }

    // Simple direct query to find user and reset token
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, email, reset_token, reset_token_expires_at FROM users WHERE email = ? AND reset_token = ? AND reset_token IS NOT NULL',
      [email, resetCode]
    );

    console.log('=== DATABASE QUERY RESULT ===');
    console.log('Users found:', users.length);
    if (users.length > 0) {
      console.log('User ID:', users[0].id);
      console.log('Reset token:', users[0].reset_token);
      console.log('Expires at:', users[0].reset_token_expires_at);
    }
    console.log('==============================');

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Reset code has expired or is invalid' },
        { status: 400 }
      );
    }

    const user = users[0];
    
    // Check if code is not expired
    const currentTime = new Date();
    const expiresAt = new Date(user.reset_token_expires_at + 'Z'); // Ensure UTC parsing
    const isExpired = expiresAt < currentTime;
    
    console.log('=== EXPIRY CHECK ===');
    console.log('Current time (UTC):', currentTime.toISOString());
    console.log('Expires at (parsed):', expiresAt.toISOString());
    console.log('Raw expires at:', user.reset_token_expires_at);
    console.log('Is expired:', isExpired);
    console.log('Time difference (minutes):', Math.floor((currentTime.getTime() - expiresAt.getTime()) / (1000 * 60)));
    console.log('======================');

    if (isExpired) {
      return NextResponse.json(
        { success: false, message: 'Reset code has expired or is invalid' },
        { status: 400 }
      );
    }

    // Code is valid
    console.log('=== VERIFICATION SUCCESS ===');
    console.log('User verified successfully');
    console.log('========================');

    return NextResponse.json({
      success: true,
      message: 'Reset code verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error: any) {
    console.error('Error in verify reset code:', error);
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
