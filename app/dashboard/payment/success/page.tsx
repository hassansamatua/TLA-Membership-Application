"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiAlertCircle, FiCheckCircle, FiCreditCard, FiHome } from 'react-icons/fi';

export default function PaymentSuccessPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referenceParam = searchParams.get('reference') || '';
  const gatewayParam = searchParams.get('gateway') === 'evpay' ? 'evpay' : 'azampay';
  const testMode = searchParams.get('test');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>(() =>
    !referenceParam ? 'error' : testMode === 'true' || referenceParam.startsWith('TEST-') ? 'failed' : 'loading'
  );
  const [message, setMessage] = useState(() =>
    !referenceParam ? 'No payment reference found' : testMode === 'true' || referenceParam.startsWith('TEST-') ? 'Unverified test payments cannot activate membership.' : 'Processing your payment...'
  );
  const [reference] = useState(referenceParam);

  useEffect(() => {
    if (!referenceParam || testMode === 'true' || referenceParam.startsWith('TEST-')) return;

    let cancelled = false;
    async function checkPaymentStatus(ref: string, gateway: string) {
      try {
        const response = await fetch(`/api/payments/${gateway}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: ref }),
          credentials: 'include',
        });
        const data = await response.json();
        if (cancelled) return;

        if (response.ok && data.success) {
          if (data.status === 'completed') {
            setStatus('success');
            setMessage('Payment successful! Your membership has been activated.');
          } else if (data.status === 'failed') {
            setStatus('failed');
            setMessage('Payment failed. Please try again or contact support.');
          } else {
            setMessage('Payment is still pending. Checking again...');
            setTimeout(() => void checkPaymentStatus(ref, gateway), 3000);
          }
        } else {
          setStatus('failed');
          setMessage(data.error || 'Unable to verify payment status');
        }
      } catch {
        if (!cancelled) {
          setStatus('failed');
          setMessage('Error verifying payment status');
        }
      }
    }

    void checkPaymentStatus(referenceParam, gatewayParam);
    return () => { cancelled = true; };
  }, [referenceParam, gatewayParam, testMode]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center py-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-6">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          )}
          {status === 'success' && (
            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-500/15 rounded-full flex items-center justify-center">
              <FiCheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          )}
          {(status === 'failed' || status === 'error') && (
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <FiAlertCircle className="h-8 w-8 text-red-600" />
            </div>
          )}
        </div>

        <div className="text-center mb-6">
          <h1 className={`text-2xl font-bold mb-2 ${
            status === 'success' ? 'text-emerald-600' :
            status === 'loading' ? 'text-blue-600' : 'text-red-600'
          }`}>
            {status === 'loading' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful!'}
            {(status === 'failed' || status === 'error') && 'Payment Failed'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
          {reference && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Reference: {reference}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {status === 'success' && (
            <>
              <button
                onClick={() => router.push('/dashboard/membership-card')}
                className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                <FiCreditCard className="mr-2 h-4 w-4" />
                View Membership Card
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
              >
                <FiHome className="mr-2 h-4 w-4" />
                Dashboard
              </button>
            </>
          )}

          {(status === 'failed' || status === 'error') && (
            <>
              <button
                onClick={() => router.push('/dashboard/payment')}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <FiCreditCard className="mr-2 h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
              >
                <FiHome className="mr-2 h-4 w-4" />
                Dashboard
              </button>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Please wait while we verify your payment...</p>
              <p>This may take a few seconds.</p>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">Need help? Contact us:</p>
            <p>Email: membership@tla.or.tz</p>
            <p>Phone: +255 22 211 3456</p>
          </div>
        </div>
      </div>
    </div>
  );
}
