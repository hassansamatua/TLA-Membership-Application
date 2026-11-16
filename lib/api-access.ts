export type Access = 'public' | 'member' | 'admin' | 'internal' | 'unavailable';
const publicReads = new Set(['/api/about-content', '/api/contact-content', '/api/home-content', '/api/settings']);
const publicAuth = new Set(['/api/auth/login', '/api/auth/register', '/api/auth/logout', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/forgot-password/verify', '/api/auth/[...nextauth]']);
const disabled = new Set([
  '/api/setup/ensure-admin', '/api/admin/create-admin', '/api/admin/fix-admin', '/api/admin/reset-admin', '/api/admin/fix-dates',
  '/api/fix-membership', '/api/verify-migration', '/api/payments/cleanup',
  '/api/payments/activate-test', '/api/payments/create-test', '/api/membership/complete-payment',
  '/api/membership/payment-success', '/api/membership/pay', '/api/membership/pay-early',
  '/api/payments/complete', '/api/payments/mobile-money', '/api/payments/azampay/checkout',
  '/api/payments/azampay/callback', '/api/payments/evpay/checkout', '/api/payments/evpay/callback',
  '/api/payment/pesapal', '/api/payment-success', '/api/complete-payment',
]);

export function azampaySandboxEnabled() {
  return process.env.ENABLE_AZAMPAY_SANDBOX === 'true'
    && process.env.AZAMPAY_ENVIRONMENT === 'sandbox'
    && Boolean(process.env.AZAMPAY_CLIENT_ID)
    && Boolean(process.env.AZAMPAY_CLIENT_SECRET)
    && Boolean(process.env.AZAMPAY_APP_NAME)
    && Boolean(process.env.AZAMPAY_API_KEY)
    && Boolean(process.env.AZAMPAY_CALLBACK_URL);
}

export function evpaySandboxEnabled() {
  return process.env.ENABLE_EVPAY_SANDBOX === 'true'
    && process.env.EVPAY_ENVIRONMENT === 'sandbox'
    && Boolean(process.env.EVPAY_CLIENT_ID)
    && Boolean(process.env.EVPAY_CLIENT_SECRET)
    && Boolean(process.env.EVPAY_CALLBACK_URL);
}

export function apiAccess(path: string, method: string): Access {
  if (path === '/api/payments/azampay/checkout' && azampaySandboxEnabled()) return 'member';
  if (path === '/api/payments/azampay/callback' && azampaySandboxEnabled() && method === 'POST') return 'public';
  if (path === '/api/payments/evpay/checkout' && evpaySandboxEnabled()) return 'member';
  if (path === '/api/payments/evpay/callback' && evpaySandboxEnabled() && method === 'POST') return 'public';
  if (disabled.has(path) || /^\/api\/(debug(?:\/|$)|test-|import-|migrate-)/.test(path)) return 'unavailable';
  if (path === '/api/payments/process' && method !== 'GET') return 'unavailable';
  if (/^\/api\/auth\/(session|signin|signout|callback(?:\/|$)|csrf|providers|error)/.test(path)) return 'public';
  if (publicAuth.has(path) || (publicReads.has(path) && method === 'GET') || (path === '/api/contact' && method === 'POST')) return 'public';
  if (path === '/api/events' && method !== 'GET') return 'admin';
  if (path.startsWith('/api/cron/')) return 'internal';
  if (path.startsWith('/api/admin/') || path === '/api/admin' || path.startsWith('/api/reports') || path === '/api/payments' || path === '/api/send-approval-email' || path === '/api/membership/next-number') return 'admin';
  if (path.startsWith('/api/auth/') && !['/api/auth/me', '/api/auth/profile', '/api/auth/membership-status'].includes(path)) return 'unavailable';
  return 'member';
}
