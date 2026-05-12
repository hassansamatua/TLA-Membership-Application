import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getAuthToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json({ success: false, message: 'Reference is required' }, { status: 400 });
    }

    connection = await pool.getConnection();

    try {
      console.log('Checking payment with reference:', reference);
      console.log('User ID from token:', decoded.id);
      
      const [paymentRows] = await connection.query(
        'SELECT * FROM payments WHERE reference = ? AND user_id = ?',
        [reference, decoded.id]
      ) as any[];

      console.log('Payment query result:', {
        rowCount: paymentRows.length,
        rows: paymentRows
      });

      if (!paymentRows.length) {
        console.error('Payment not found with reference:', reference);
        return NextResponse.json(
          { 
            success: false, 
            message: 'Payment not found',
            details: `No payment found with reference: ${reference} for user: ${decoded.id}`
          },
          { status: 404 }
        );
      }

      const payment = paymentRows[0];
      console.log('Payment found:', payment);

      return NextResponse.json({
        success: true,
        message: 'Payment found',
        data: {
          reference: payment.reference,
          amount: payment.amount,
          status: payment.status,
          payment_method: payment.payment_method,
          created_at: payment.created_at
        }
      });

    } catch (error) {
      console.error('Error checking payment:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to check payment',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Check payment API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process payment check',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
