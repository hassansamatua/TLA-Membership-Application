// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Chrome DevTools
  if (pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/) || 
      pathname.startsWith('/.well-known/') || 
      pathname.startsWith('/_next/') || 
      pathname.startsWith('/__webpack_hmr')) {
    return NextResponse.next();
  }

  // Check for token in both Authorization header and cookies
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : request.cookies.get('token')?.value;
  
  console.log(`[Middleware] Path: ${pathname}, Has Token: ${!!token}`);

  // Allow public routes, auth routes, and API routes
  if (pathname.startsWith('/api') || 
      pathname === '/auth/login' || 
      pathname === '/auth/register' ||
      pathname === '/auth/forgot-password' ||
      pathname === '/auth/reset-password' ||
      pathname === '/auth/pending-approval' ||
      pathname === '/terms' ||
      pathname === '/privacy') {
    console.log(`[Middleware] Allowing access to: ${pathname}`);
    return NextResponse.next();
  }

  // If no token, redirect to login
  if (!token) {
    console.log('[Middleware] No token found, redirecting to login');
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    console.log('[Middleware] Verifying token...');
    console.log('[Middleware] Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'null');
    // Verify token by making a request to the /api/auth/me endpoint
    const meUrl = new URL('/api/auth/me', request.url);
    console.log(`[Middleware] Calling ${meUrl.toString()}`);
    
    const response = await fetch(meUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `token=${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      credentials: 'include',
      cache: 'no-store'
    });

    console.log(`[Middleware] Auth check status: ${response.status}`);

    if (!response.ok) {
      console.log(`[Middleware] Auth check failed with status: ${response.status}`);
      
      // If token expired, clear it and redirect to login
      if (response.status === 401 || response.status === 500) {
        console.log('[Middleware] Token expired or invalid, clearing and redirecting');
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const redirectResponse = NextResponse.redirect(loginUrl);
        redirectResponse.cookies.delete('token');
        return redirectResponse;
      }
      
      throw new Error('Invalid token');
    }

    const userData = await response.json();
    console.log(`[Middleware] User data:`, JSON.stringify({
      id: userData.id,
      email: userData.email,
      isAdmin: userData.isAdmin || userData.is_admin,
      isApproved: userData.is_approved
    }));
    
    // Check if user is approved (bypass for admin users)
    const isAdmin = Boolean(userData.isAdmin || userData.is_admin);
    if (!isAdmin && userData.is_approved === false && !pathname.startsWith('/auth/pending-approval')) {
      console.log('[Middleware] Non-admin user not approved, redirecting to pending approval page');
      return NextResponse.redirect(new URL('/auth/pending-approval', request.url));
    }
    
    // If trying to access admin routes without admin privileges
    if (pathname.startsWith('/admin')) {
      console.log(`[Middleware] Admin route access - isAdmin: ${isAdmin}`);
      
      if (!isAdmin) {
        console.log('[Middleware] Non-admin user trying to access admin route, redirecting to /dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Clone the request headers and add user info
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userData.id);
    requestHeaders.set('x-user-role', (userData.isAdmin || userData.is_admin) ? 'admin' : 'user');

    console.log('[Middleware] Authentication successful, proceeding to route');
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    // Clear invalid token and redirect to login
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};