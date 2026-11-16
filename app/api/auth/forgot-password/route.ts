import { requestReset, verifyReset } from '@/lib/password-reset';

// POST - Send reset code
export async function POST(request: Request) {
  return requestReset(request);
}

// POST - Verify reset code and reset password
export async function PUT(request: Request) {
  return verifyReset(request, true);
}
