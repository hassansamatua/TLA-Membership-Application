import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import { apiAccess } from '../lib/api-access.ts';
import { getJwtSecret, generateToken, verifyToken } from '../lib/auth.ts';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const withSecret = async (value, fn) => {
  const previous = process.env.JWT_SECRET;
  if (value === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = value;
  try { return await fn(); } finally {
    if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
  }
};

test('route policy blocks unauthenticated administrative and development operations', () => {
  assert.equal(apiAccess('/api/admin/users', 'GET'), 'admin');
  assert.equal(apiAccess('/api/admin/reports/summary', 'GET'), 'admin');
  assert.equal(apiAccess('/api/reports', 'GET'), 'admin');
  assert.equal(apiAccess('/api/setup/ensure-admin', 'POST'), 'unavailable');
  assert.equal(apiAccess('/api/admin/create-admin', 'POST'), 'unavailable');
  assert.equal(apiAccess('/api/migrate-data', 'POST'), 'unavailable');
  assert.equal(apiAccess('/api/import-db', 'POST'), 'unavailable');
  assert.equal(apiAccess('/api/payments/cleanup', 'POST'), 'unavailable');
  assert.equal(apiAccess('/api/test-db', 'GET'), 'unavailable');
  assert.equal(apiAccess('/api/debug/current-user', 'GET'), 'unavailable');
});

test('member and intentionally public routes retain safe classifications', () => {
  assert.equal(apiAccess('/api/auth/login', 'POST'), 'public');
  assert.equal(apiAccess('/api/auth/register', 'POST'), 'public');
  assert.equal(apiAccess('/api/auth/forgot-password', 'POST'), 'public');
  assert.equal(apiAccess('/api/home-content', 'GET'), 'public');
  assert.equal(apiAccess('/api/auth/me', 'GET'), 'member');
  assert.equal(apiAccess('/api/auth/profile', 'GET'), 'member');
  assert.equal(apiAccess('/api/messages', 'GET'), 'member');
  assert.equal(apiAccess('/api/events', 'GET'), 'member');
  assert.equal(apiAccess('/api/events', 'POST'), 'admin');
  assert.equal(apiAccess('/api/membership/status', 'GET'), 'member');
});

test('client-declared and unverified payment completion is unavailable', () => {
  for (const path of [
    '/api/membership/pay', '/api/membership/pay-early', '/api/membership/complete-payment',
    '/api/membership/payment-success', '/api/payments/complete', '/api/payments/mobile-money',
    '/api/payments/azampay/checkout', '/api/payments/azampay/callback', '/api/payment/pesapal',
    '/api/payments/activate-test', '/api/payments/create-test', '/api/payment-success', '/api/complete-payment'
  ]) assert.equal(apiAccess(path, 'POST'), 'unavailable');
  assert.equal(apiAccess('/api/payments/process', 'POST'), 'unavailable');
  assert.equal(apiAccess('/api/payments/process', 'GET'), 'member');
});

test('password reset code is not returned, logged, or stored in plaintext', () => {
  const route = source('app/api/auth/forgot-password/route.ts');
  const verifyRoute = source('app/api/auth/forgot-password/verify/route.ts');
  const workflow = source('lib/password-reset.ts');
  assert.doesNotMatch(route, /resetCode:\s*resetCode|expiryTime:\s*expiryTime/);
  assert.doesNotMatch(route, /console\.(log|error|warn)/);
  assert.doesNotMatch(verifyRoute, /console\.(log|error|warn)|reset_token/);
  assert.match(workflow, /If the account is eligible/);
  assert.match(workflow, /timingSafeEqual/);
  assert.match(workflow, /reset_token_expires_at > UTC_TIMESTAMP\(\)/);
  assert.match(workflow, /reset_token = NULL/);
  assert.match(workflow, /count >= 5/);
});

test('JWT configuration fails closed instead of using public fallback secrets', async () => {
  await withSecret(undefined, () => assert.throws(() => generateToken({ id: 1 }), /configuration unavailable/));
  await withSecret('your-secret-key', () => assert.throws(() => generateToken({ id: 1 }), /configuration unavailable/));
  await withSecret('short', () => assert.throws(() => generateToken({ id: 1 }), /configuration unavailable/));
});

test('JWT verification rejects invalid, expired, and wrong-secret tokens', async () => {
  await withSecret('x'.repeat(32), () => {
    const token = generateToken({ id: 7, email: 'member@example.test', is_admin: false });
    assert.equal(verifyToken(token).id, 7);
    assert.throws(() => verifyToken(`${token}x`), /Invalid or expired/);
    assert.throws(() => verifyToken(jwt.sign({ id: 7 }, 'y'.repeat(32))), /Invalid or expired/);
    const expired = jwt.sign({ id: 7, email: 'member@example.test', isAdmin: false }, 'x'.repeat(32), { expiresIn: -1 });
    assert.throws(() => verifyToken(expired), /expired/i);
  });
});
