"use client";

import { useState } from 'react';
import { FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import PaymentMethodSelector from './PaymentMethodSelector';
import SimplePhoneInput from './SimplePhoneInput';
import AzamPayCheckout from './AzamPayCheckout';


interface PaymentFormProps {
  userId: string;
  membershipType: string;
  amount: number;
  onSuccess?: (reference: string) => void;
  onError?: (error: string) => void;
}

export default function PaymentForm({ 
  userId, 
  membershipType, 
  amount, 
  onSuccess, 
  onError 
}: PaymentFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    reference: string;
    checkoutUrl: string;
    testMode: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentSubmit = async () => {
    if (!selectedMethod || !phoneNumber) {
      setError('Please select a payment method and enter your phone number');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/azampay/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipType,
          amount,
          userId,
          paymentMethod: selectedMethod,
          phoneNumber,
          customerName: '', // Will be fetched from user profile
          customerEmail: '', // Will be fetched from user profile
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCheckoutData({
          reference: data.reference,
          checkoutUrl: data.checkoutUrl,
          testMode: data.testMode || false,
        });
        onSuccess?.(data.reference);
      } else if (data.fallback) {
        // Handle fallback scenario
        setError(data.error || 'Payment gateway temporarily unavailable');
        // Show fallback instructions
        setCheckoutData({
          reference: data.reference,
          checkoutUrl: '',
          testMode: false,
        });
      } else {
        throw new Error(data.error || 'Payment initialization failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentComplete = (status: 'success' | 'failed' | 'pending') => {
    if (status === 'success') {
      onSuccess?.(checkoutData?.reference || '');
    } else if (status === 'failed') {
      setError('Payment failed. Please try again.');
      onError?.('Payment failed');
    }
  };

  const handleReset = () => {
    setSelectedMethod(null);
    setPhoneNumber('');
    setCheckoutData(null);
    setError(null);
  };

  if (checkoutData) {
    return (
      <div className="space-y-6">
        <AzamPayCheckout
          reference={checkoutData.reference}
          checkoutUrl={checkoutData.checkoutUrl}
          amount={amount}
          onPaymentComplete={handlePaymentComplete}
          testMode={checkoutData.testMode}
        />
        
        <button
          onClick={handleReset}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Start New Payment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Membership Payment</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Membership Type</p>
              <p className="font-semibold text-gray-900 capitalize">{membershipType}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Amount</p>
              <p className="text-2xl font-bold text-green-600">TZS {amount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <FiAlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      <PaymentMethodSelector
        selectedMethod={selectedMethod}
        onMethodSelect={setSelectedMethod}
        amount={amount}
      />

      <SimplePhoneInput
        value={phoneNumber}
        onChange={setPhoneNumber}
        label="Phone Number for Payment"
        placeholder="Enter your phone number (e.g., +255 712 345 678)"
        required
      />

      <button
        onClick={handlePaymentSubmit}
        disabled={!selectedMethod || !phoneNumber || isProcessing}
        className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
      >
        {isProcessing ? (
          <>
            <FiLoader className="w-5 h-5 animate-spin" />
            <span>Initializing Payment...</span>
          </>
        ) : (
          <span>Proceed to Payment</span>
        )}
      </button>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Important Information</p>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              <li>• Ensure your phone number is correct for payment verification</li>
              <li>• You will receive payment confirmation via SMS</li>
              <li>• Keep this page open until payment is complete</li>
              <li>• For support, contact: membership@tla.or.tz</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
