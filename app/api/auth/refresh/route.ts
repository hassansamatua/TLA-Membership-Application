import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

// JWT secret keys - must match those used in auth.ts
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-development';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.warn('JWT_SECRET and JWT_REFRESH_SECRET not set in environment, using fallback values');
}

export async function POST(request: Request) {
  try {
    // Get refresh token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const refreshToken = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('refreshToken='))
      ?.split('=')[1];

    if (!refreshToken) {
      console.error('No refresh token found in cookies');
      return NextResponse.json(
        { message: 'No refresh token provided' },
        { status: 401 }
      );
    }

    console.log('Refresh token found, verifying...');

    // Verify the refresh token
    const secret = new TextEncoder().encode(JWT_REFRESH_SECRET);
    let payload;
    
    try {
      const result = await jwtVerify(refreshToken, secret);
      payload = result.payload;
      console.log('Refresh token verified successfully, payload:', payload);
    } catch (error) {
      console.error('Invalid refresh token:', error);
      return NextResponse.json(
        { message: 'Invalid or expired refresh token' },
        { 
          status: 401,
          headers: {
            'Set-Cookie': 'refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None'
          }
        }
      );
    }

    // Generate a new access token
    const accessTokenSecret = new TextEncoder().encode(JWT_SECRET);
    const newToken = await new SignJWT({ 
      userId: payload.userId,
      email: payload.email,
      isAdmin: payload.isAdmin || false
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(accessTokenSecret);

    console.log('New access token generated');

    // Create response with new access token
    const response = new NextResponse(
      JSON.stringify({ 
        message: 'Token refreshed successfully',
        accessToken: newToken
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache'
        }
      }
    );

    // Set the new access token in an HTTP-only cookie
    response.cookies.set({
      name: 'token',
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    console.log('New access token set in cookie');
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
