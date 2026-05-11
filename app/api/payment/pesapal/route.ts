import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';

// Extend the Session type to include the user with id
interface ExtendedSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// PesaPal API credentials from environment variables
const CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || '';
const API_ENDPOINT = process.env.NEXT_PUBLIC_PESAPAL_ENV === 'production' 
  ? 'https://pay.pesapal.com/v3' 
  : 'https://cybqa.pesapal.com/pesapalv3';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;

    const { amount, description, phoneNumber, reference } = await request.json();
    
    if (!amount || !description) {
      return NextResponse.json(
        { error: 'Amount and description are required' },
        { status: 400 }
      );
    }

    // Generate a timestamp
    const timestamp = new Date().toISOString().split('.')[0] + 'Z';
    
    // Generate a nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Create the auth header
    const auth = `Bearer ${await getAccessToken()}`;
    
    // Prepare the payment request
    const paymentData = {
      reference: `TLA-${Date.now()}-${user.id}`,
      currency: 'KES',
      amount: amount,
      description: description,
      callback_url: `${process.env.NEXTAUTH_URL}/dashboard/payment/callback`,
      notification_id: process.env.PESAPAL_NOTIFICATION_ID || '',
      billing_address: {
        email_address: user.email || '',
        phone_number: phoneNumber || '',
        country_code: 'KE',
        first_name: user.name?.split(' ')[0] || 'User',
        last_name: user.name?.split(' ')[1] || 'Account',
      },
    };

    // Make the API request to PesaPal
    const response = await fetch(`${API_ENDPOINT}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
        'Accept': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PesaPal API Error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Payment processing failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      order_tracking_id: data.order_tracking_id,
      payment_url: data.redirect_url,
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get access token from PesaPal
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  
  const response = await fetch(`${API_ENDPOINT}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${auth}`,
    },
    body: JSON.stringify({
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get access token');
  }

  return data.token;
}
