import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('[Test-Echo] Request received');
    
    const body = await request.json();
    console.log('[Test-Echo] Request body:', body);
    
    const headers = Object.fromEntries(request.headers.entries());
    console.log('[Test-Echo] Request headers:', headers);
    
    return NextResponse.json({
      success: true,
      message: 'Echo successful',
      received: body,
      headers: {
        contentType: request.headers.get('content-type'),
        authorization: request.headers.get('authorization') ? 'present' : 'missing',
        cookie: request.headers.get('cookie') ? 'present' : 'missing'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Test-Echo] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
