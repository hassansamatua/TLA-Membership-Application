import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { verifyToken } from '@/lib/auth';
import { pool } from '@/lib/db';

export interface AuthenticatedUser {
  id: number;
  email: string;
  isAdmin: boolean;
}

function readToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookie = (request.headers.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('token='));
  return cookie ? decodeURIComponent(cookie.slice('token='.length)) : null;
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = readToken(request);
  if (!token) return null;

  let userId: number | undefined;
  try {
    userId = verifyToken(token)?.id;
  } catch {
    return null;
  }
  if (!userId) return null;

  // Re-read the role from the database so revoked admins lose access immediately.
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, email, is_admin FROM users WHERE id = ?',
    [userId]
  );
  if (!rows.length) return null;

  return { id: rows[0].id, email: rows[0].email, isAdmin: Boolean(rows[0].is_admin) };
}

export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }
  return null;
}

// Maintenance/debug/migration endpoints are hidden unless explicitly enabled, and then admin-only.
export async function requireMaintenanceAccess(request: Request): Promise<NextResponse | null> {
  if (process.env.ENABLE_MAINTENANCE_ROUTES !== 'true') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  return requireAdmin(request);
}
