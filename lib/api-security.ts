import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { verifyToken } from './auth';
import { pool } from './db';
import { apiAccess, type Access } from './api-access';
import type { RowDataPacket } from 'mysql2/promise';

export { apiAccess };
export type { Access };

export function authToken(request: Request) {
  const header = request.headers.get('authorization');
  if (header) return header.startsWith('Bearer ') ? header.slice(7) : '';
  return request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('token='))?.slice(6) || '';
}

export async function requireUser(request: Request) {
  const decoded = verifyToken(authToken(request));
  const [users] = await pool.query<RowDataPacket[]>('SELECT id, is_admin, is_approved FROM users WHERE id = ?', [decoded.id]);
  if (!users[0]) throw new Error('Unauthorized');
  return { id: Number(users[0].id), isAdmin: users[0].is_admin === 1 || users[0].is_admin === true, isApproved: users[0].is_approved === 1 || users[0].is_approved === true };
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if (!user.isAdmin) throw new Error('Forbidden');
  return user;
}

export async function authorizeApi(request: Request) {
  const path = new URL(request.url).pathname.replace(/\/$/, '');
  const access = apiAccess(path, request.method);
  if (access === 'unavailable') return NextResponse.json({ error: 'Operation unavailable during security containment' }, { status: 503 });
  if (access === 'public') return null;
  if (access === 'internal') {
    const expected = process.env.CRON_SECRET;
    const supplied = request.headers.get('x-cron-secret') || '';
    if (expected && expected.length >= 32 && Buffer.byteLength(expected) === Buffer.byteLength(supplied) && timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return null;
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let user;
  try { user = await requireUser(request); }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if ((access === 'admin' && !user.isAdmin) || (!user.isAdmin && !user.isApproved && path !== '/api/auth/me' && path !== '/api/auth/profile')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
