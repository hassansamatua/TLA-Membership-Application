import { requireMaintenanceAccess } from '@/lib/apiGuard';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const denied = await requireMaintenanceAccess(request);
  if (denied) return denied;

  console.log('[Test-Simple] Request received at:', new Date().toISOString());
  
  try {
    // Just return a simple response without any database operations
    return NextResponse.json({
      success: true,
      message: 'Simple test successful',
      timestamp: new Date().toISOString(),
      received: 'ok'
    });
  } catch (error) {
    console.error('[Test-Simple] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Simple test failed'
    }, { status: 500 });
  }
}
