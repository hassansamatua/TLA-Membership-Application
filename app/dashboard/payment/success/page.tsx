"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiCheckCircle, FiAlertCircle, FiLoader, FiHome, FiCreditCard } from 'react-icons/fi';

export default function PaymentSuccessPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState<string>('Processing your payment...');
  const [reference, setReference] = useState<string>('');

  useEffect(() => {
    const referenceParam = searchParams.get('reference');
    const testMode = searchParams.get('test');
    
    if (referenceParam) {
      setReference(referenceParam);
      
      // If test mode, immediately show success and activate membership
      if (testMode === 'true' || referenceParam.startsWith('TEST-')) {
        setStatus('success');
        setMessage('Payment successful! Your membership has been activated.');
        
        // For test payments, activate membership via server action
        activateTestMembership(referenceParam);
        
        // Ensure the payment status is marked as completed
        // The API will handle updating the membership status
      } else {
        // Real payment - check status
        checkPaymentStatus(referenceParam);
      }
    } else {
      setStatus('failed');
      setMessage('No payment reference found');
    }
  }, [searchParams]);

  const activateTestMembership = async (ref: string) => {
    console.log('Starting test membership activation for reference:', ref);
    
    try {
      // First, ensure the test payment exists
      console.log('Creating test payment...');
      const createResponse = await fetch('/api/payments/create-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ reference: ref }),
        credentials: 'include',
      });

      const createData = await createResponse.json();
      console.log('Create test payment response:', {
        status: createResponse.status,
        ok: createResponse.ok,
        data: createData
      });

      if (!createResponse.ok) {
        console.error('Failed to create test payment:', createData.error || 'Unknown error');
        return;
      }

      // Test simple endpoint to isolate the issue
      console.log('Testing simple endpoint...');
      try {
        const simpleResponse = await fetch('/api/test-simple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: true }),
          credentials: 'include',
        });
        
        console.log('Simple response status:', simpleResponse.status);
        console.log('Simple response ok:', simpleResponse.ok);
        
        const simpleData = await simpleResponse.json().catch(async (e) => {
          console.error('Simple JSON parse failed:', e);
          const text = await simpleResponse.text().catch(() => 'Failed to read simple response text');
          console.error('Simple raw text:', text);
          return { error: 'Simple JSON failed', rawText: text };
        });
        
        console.log('Simple response data:', simpleData);
      } catch (simpleError) {
        console.error('Simple test failed:', simpleError);
        console.error('Simple error type:', typeof simpleError);
        console.error('Simple error message:', simpleError instanceof Error ? simpleError.message : 'Unknown error');
      }

      // Test echo endpoint first to isolate the issue
      console.log('Testing echo endpoint...');
      try {
        const echoResponse = await fetch('/api/test-echo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reference: ref, test: true }),
          credentials: 'include',
        });
        
        const echoData = await echoResponse.json();
        console.log('Echo response:', {
          status: echoResponse.status,
          ok: echoResponse.ok,
          data: echoData
        });
      } catch (echoError) {
        console.error('Echo test failed:', echoError);
      }

      // Then activate the membership
      console.log('Activating test membership...');
      let response;
      let data;
      
      try {
        response = await fetch('/api/payments/activate-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({ reference: ref }),
          credentials: 'include',
        });
        console.log('Fetch completed, response status:', response.status);
      } catch (fetchError) {
        console.error('Fetch failed completely:', fetchError);
        console.error('Fetch error type:', typeof fetchError);
        console.error('Fetch error message:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
        return;
      }
      
      try {
        data = await response.json().catch(async (e) => {
          console.error('Failed to parse JSON response:', e);
          // Try to get the raw response text to see what's actually being returned
          const text = await response.text().catch(() => 'Could not read response text');
          console.error('Raw response text:', text);
          console.error('Response headers:', Object.fromEntries(response.headers.entries()));
          return { error: 'Invalid JSON response', rawText: text };
        });
      } catch (jsonError) {
        console.error('JSON parsing failed completely:', jsonError);
        data = { error: 'JSON parsing failed', details: jsonError instanceof Error ? jsonError.message : 'Unknown error' };
      }
      
      console.log('Activate test membership response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });
      
      // Log the specific error details
      if (data && data.error) {
        console.error('API Error Details:');
        console.error('- Error:', data.error);
        console.error('- Details:', data.details);
        console.error('- Success:', data.success);
      }
      
      if (response.ok && data.success) {
        console.log('Test membership activated for reference:', ref);
        console.log('Membership number:', data.data?.membershipNumber);
      } else {
        console.error('Failed to activate test membership:', data.error || 'Unknown error');
        console.error('Response status:', response.status);
        console.error('Response data:', data);
        console.error('Response data type:', typeof data);
        console.error('Response data keys:', data ? Object.keys(data) : 'null');
        
        // Try to get more details from the response text if JSON parsing failed
        if (response.status >= 400) {
          const text = await response.text().catch(() => 'Failed to read response text');
          console.error('Raw response text:', text);
        }
      }
    } catch (error) {
      console.error('Error activating test membership:', error);
      // Don't show error to user, just log it
    }
  };

  const checkPaymentStatus = async (ref: string) => {
    try {
      const response = await fetch(`/api/payments/azampay/checkout?reference=${ref}`);
      const data = await response.json();

      if (response.ok && data.success) {
        const paymentStatus = data.status;
        
        if (paymentStatus.data.status === 'SUCCESS') {
          setStatus('success');
          setMessage('Payment successful! Your membership has been activated.');
          
          // Don't auto-redirect - let user choose when to view card
          // setTimeout(() => {
          //   router.push('/dashboard/membership-card');
          // }, 3000);
        } else if (paymentStatus.data.status === 'FAILED') {
          setStatus('failed');
          setMessage('Payment failed. Please try again or contact support.');
        } else {
          // Still pending, check again in a few seconds
          setTimeout(() => checkPaymentStatus(ref), 3000);
        }
      } else {
        setStatus('failed');
        setMessage('Unable to verify payment status');
      }
    } catch (error) {
      console.error('Payment status check error:', error);
      setStatus('failed');
      setMessage('Error verifying payment status');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          )}
          {status === 'success' && (
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="h-8 w-8 text-green-600" />
            </div>
          )}
          {status === 'failed' && (
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <FiAlertCircle className="h-8 w-8 text-red-600" />
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="text-center mb-6">
          <h1 className={`text-2xl font-bold mb-2 ${
            status === 'success' ? 'text-green-600' : 
            status === 'failed' ? 'text-red-600' : 'text-blue-600'
          }`}>
            {status === 'loading' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </h1>
          
          <p className="text-gray-600 mb-4">{message}</p>
          
          {reference && (
            <p className="text-sm text-gray-500">
              Reference: {reference}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === 'success' && (
            <>
              <button
                onClick={() => router.push('/dashboard/membership-card')}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <FiCreditCard className="mr-2 h-4 w-4" />
                View Membership Card
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                <FiHome className="mr-2 h-4 w-4" />
                Dashboard
              </button>
            </>
          )}
          
          {status === 'failed' && (
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
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                <FiHome className="mr-2 h-4 w-4" />
                Dashboard
              </button>
            </>
          )}
          
          {status === 'loading' && (
            <div className="text-center text-sm text-gray-500">
              <p>Please wait while we verify your payment...</p>
              <p>This may take a few seconds.</p>
            </div>
          )}
        </div>

        {/* Help Information */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">Need help? Contact us:</p>
            <p>Email: membership@tla.or.tz</p>
            <p>Phone: +255 22 211 3456</p>
          </div>
        </div>
      </div>
    </div>
  );
}
