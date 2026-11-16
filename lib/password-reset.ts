import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from './db';
import { getJwtSecret, hashPassword } from './auth';
import { sendPasswordResetEmail } from './email-simple';

const generic = { success: true, message: 'If the account is eligible, a reset code will be emailed.' };
const invalid = () => NextResponse.json({ success: false, message: 'Reset code has expired or is invalid' }, { status: 400 });
const attempts = new Map<string, { count: number; until: number }>();

export function allowResetRequest(key: string, limit = 5, now = Date.now()) {
  for (const [k, entry] of attempts) if (entry.until <= now) attempts.delete(k);
  const entry = attempts.get(key) || { count: 0, until: now + 15 * 60_000 };
  if (attempts.size >= 10000 && !attempts.has(key)) return false;
  attempts.set(key, entry);
  return ++entry.count <= limit;
}

export function resetDigest(email: string, code: string) {
  return createHmac('sha256', getJwtSecret()).update(`${email}\0${code}`).digest('hex');
}

export function matchesReset(stored: string, digest: string) {
  const value = stored.split(':')[0];
  return /^[a-f0-9]{64}$/.test(value) && timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(digest, 'hex'));
}

export async function requestReset(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254) return NextResponse.json(generic);
    const key = resetDigest(email, 'request');
    if (!allowResetRequest(key)) return NextResponse.json(generic);
    const code = randomInt(100000, 1000000).toString();
    const digest = resetDigest(email, code);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET reset_token = ?, reset_token_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)
       WHERE email = ? AND (reset_token_expires_at IS NULL OR reset_token_expires_at <= UTC_TIMESTAMP())`,
      [`${digest}:0`, email]
    );
    if (result.affectedRows === 1) await sendPasswordResetEmail(email, code);
    return NextResponse.json(generic);
  } catch {
    return NextResponse.json(generic);
  }
}

export async function verifyReset(request: Request, consume = false) {
  let connection;
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body.resetCode === 'string' ? body.resetCode : '';
    if (!email || email.length > 254 || !/^\d{6}$/.test(code)) return invalid();
    if (consume && (typeof body.newPassword !== 'string' || body.newPassword.length < 8 || Buffer.byteLength(body.newPassword) > 72)) {
      return NextResponse.json({ success: false, message: 'Password must be 8 to 72 bytes' }, { status: 400 });
    }
    const digest = resetDigest(email, code);
    if (!allowResetRequest(resetDigest(email, 'verify'), 10)) return invalid();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = (await connection.query(
      `SELECT id, reset_token FROM users WHERE email = ? AND reset_token IS NOT NULL
       AND reset_token_expires_at > UTC_TIMESTAMP() FOR UPDATE`, [email]
    )) as [RowDataPacket[], any];
    const user = rows[0];
    const count = user ? Number(String(user.reset_token).split(':')[1]) : 5;
    if (!user || !Number.isInteger(count) || count >= 5) {
      await connection.rollback();
      return invalid();
    }
    const valid = matchesReset(String(user.reset_token), digest);
    if (valid && consume) {
      const password = await hashPassword(body.newPassword);
      await connection.query('UPDATE users SET password = ?, reset_token = NULL WHERE id = ?', [password, user.id]);
    } else {
      await connection.query('UPDATE users SET reset_token = ? WHERE id = ?', [`${String(user.reset_token).split(':')[0]}:${count + 1}`, user.id]);
    }
    await connection.commit();
    return valid ? NextResponse.json({ success: true, message: consume ? 'Password has been reset successfully' : 'Reset code verified successfully' }) : invalid();
  } catch {
    if (connection) await connection.rollback();
    return invalid();
  } finally {
    connection?.release();
  }
}
