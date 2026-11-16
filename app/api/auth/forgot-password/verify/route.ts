import { verifyReset } from '@/lib/password-reset';

// POST - Verify reset code
export async function POST(request: Request) {
  return verifyReset(request);
}
