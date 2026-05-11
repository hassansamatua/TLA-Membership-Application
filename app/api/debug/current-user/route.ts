import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    console.log('[Debug-Current-User] Token found:', !!token);
    
    if (!token) {
      return NextResponse.json({ 
        error: 'No token found',
        user: null 
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    console.log('[Debug-Current-User] Decoded user:', decoded);
    
    return NextResponse.json({ 
      success: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        isAdmin: decoded.isAdmin
      }
    });
    
  } catch (error) {
    console.error('[Debug-Current-User] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      user: null 
    }, { status: 500 });
  }
}
