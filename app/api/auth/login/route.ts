// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { comparePasswords, generateToken } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log('Login attempt for email:', email);
    
    // Get user from database
    const [users] = await pool.query<any[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    const user = users[0];
    console.log('User found:', user ? { id: user.id, email: user.email } : 'No user found');
    
    if (!user) {
      console.log('No user found with email:', email);
      return new NextResponse(
        JSON.stringify({ message: 'No account found with this email' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const passwordMatch = await comparePasswords(password, user.password);
    console.log('Password match result:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('Password does not match for user:', user.email);
      return new NextResponse(
        JSON.stringify({ message: 'Incorrect password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is approved
    if (!user.is_approved) {
      console.log('User not approved:', user.email);
      return new NextResponse(
        JSON.stringify({ 
          message: 'Your account is pending approval. Please contact the administrator.' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate JWT token
    const token = generateToken(user);
    console.log('Generated token:', token ? 'Token generated successfully' : 'Failed to generate token');

    // Create response with user data and token
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin,
        isApproved: user.is_approved
      },
      token: token
    });

    // Set HTTP-only cookie with proper attributes
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: false, // Set to false for localhost development
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    
    // Log cookie being set for debugging
    console.log('Cookie set successfully:', {
      name: 'token',
      value: token.substring(0, 20) + '...',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    console.log('Login successful, returning response');
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}