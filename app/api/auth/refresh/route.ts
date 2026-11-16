import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { generateToken } from '@/lib/auth';
import { pool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// JWT secret keys - must match those used in auth.ts
export async function POST(request: Request) {
  try {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) return NextResponse.json({ message: 'Authentication configuration unavailable' }, { status: 503 });
    const refreshToken = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('refreshToken='))?.slice(13);
    if (!refreshToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { payload } = await jwtVerify(refreshToken, new TextEncoder().encode(secret), { algorithms: ['HS256'], requiredClaims: ['exp', 'iat'] });
    const id = Number(payload.id ?? payload.userId);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const [users] = await pool.query<RowDataPacket[]>('SELECT id, email, is_admin, is_approved FROM users WHERE id = ?', [id]);
    if (!users[0] || !users[0].is_approved) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const token = generateToken(users[0]);
    const response = NextResponse.json({ message: 'Token refreshed successfully', accessToken: token });
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 86400, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
