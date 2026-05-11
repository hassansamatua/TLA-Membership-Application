"use client";

import { useState } from 'react';
import { FiLoader, FiExternalLink, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

interface AzamPayCheckoutProps {
  reference: string;
  checkoutUrl: string;
  amount: number;
  onPaymentComplete?: (status: 'success' | 'failed' | 'pending') => void;
  testMode?: boolean;
}

export default function AzamPayCheckout({ 
  reference, 
  checkoutUrl, 
  amount, 
  onPaymentComplete,
  testMode = false 
}: AzamPayCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentRedirect = () => {
    setIsLoading(true);
    setError(null);

    // For test mode, simulate payment completion
    if (testMode) {
      setTimeout(() => {
        setPaymentStatus('success');
        setIsLoading(false);
        onPaymentComplete?.('success');
      }, 2000);
      return;
    }

    // Redirect to AzamPay checkout
    window.open(checkoutUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    // Start polling for payment status
    startPaymentPolling();
  };

  const startPaymentPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/azampay/checkout?reference=${reference}`);
        const data = await response.json();

        if (data.success && data.status?.data?.status) {
          const status = data.status.data.status;
          
          if (status === 'SUCCESS') {
            setPaymentStatus('success');
            setIsLoading(false);
            onPaymentComplete?.('success');
            clearInterval(pollInterval);
          } else if (status === 'FAILED') {
            setPaymentStatus('failed');
            setIsLoading(false);
            onPaymentComplete?.('failed');
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        setError('Failed to check payment status');
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isLoading) {
        setIsLoading(false);
        setError('Payment verification timed out. Please check your payment status manually.');
      }
    }, 5 * 60 * 1000);
  };

  const handleCheckStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/azampay/checkout?reference=${reference}`);
      const data = await response.json();

      if (data.success && data.status?.data?.status) {
        const status = data.status.data.status;
        
        if (status === 'SUCCESS') {
          setPaymentStatus('success');
          onPaymentComplete?.('success');
        } else if (status === 'FAILED') {
          setPaymentStatus('failed');
          onPaymentComplete?.('failed');
        } else {
          setPaymentStatus('pending');
        }
      } else {
        setError('Failed to check payment status');
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      setError('Failed to check payment status');
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <FiCheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
            <p className="text-green-600 mt-1">
              Your payment of TZS {amount.toLocaleString()} has been processed successfully.
            </p>
            <p className="text-sm text-green-500 mt-2">
              Reference: {reference}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <FiAlertCircle className="w-8 h-8 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Payment Failed</h3>
            <p className="text-red-600 mt-1">
              Your payment could not be processed. Please try again or contact support.
            </p>
            <p className="text-sm text-red-500 mt-2">
              Reference: {reference}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Complete Your Payment</h3>
          <p className="text-gray-600 mt-1">
            Amount: <span className="font-semibold">TZS {amount.toLocaleString()}</span>
          </p>
          <p className="text-sm text-gray-500">
            Reference: {reference}
          </p>
          {testMode && (
            <p className="text-sm text-blue-600 mt-2">
              <strong>Test Mode:</strong> This is a simulated payment for testing purposes.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePaymentRedirect}
            disabled={isLoading}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <FiLoader className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <FiExternalLink className="w-5 h-5" />
                <span>Pay with AzamPay</span>
              </>
            )}
          </button>

          {!testMode && (
            <button
              onClick={handleCheckStatus}
              disabled={isLoading}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Check Status
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FiAlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Payment Instructions</p>
              <ul className="text-sm text-blue-600 mt-1 space-y-1">
                <li>• Click "Pay with AzamPay" to open the secure payment page</li>
                <li>• Complete the payment using your preferred mobile money provider</li>
                <li>• You'll be redirected back here after payment completion</li>
                <li>• Keep this page open to track your payment status</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
