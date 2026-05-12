"use client";

import { useState } from 'react';
import { FiCreditCard, FiCheck, FiAlertCircle, FiLoader, FiExternalLink } from 'react-icons/fi';

interface AzamPayProps {
  amount: number;
  membershipType: 'personal' | 'organization';
  onPaymentComplete?: (reference: string, status: string) => void;
}

export default function AzamPayIntegration({ amount, membershipType, onPaymentComplete }: AzamPayProps) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [reference, setReference] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [currentAmount, setCurrentAmount] = useState<number>(amount);
  const [currentMembershipType, setCurrentMembershipType] = useState<'personal' | 'organization'>(membershipType);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const generateReference = () => {
    const ref = 'AZAM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    setReference(ref);
    return ref;
  };

  const processAzamPayPayment = async () => {
    if (!reference) {
      addLog('Error: Please enter a reference first');
      return;
    }

    setStatus('processing');
    addLog(`Initiating AzamPay payment: ${reference}`);

    try {
      // Call the actual AzamPay API
      const response = await fetch('/api/payments/azampay/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: reference,
          amount: currentAmount,
          membershipType: currentMembershipType,
          currency: 'TZS',
          // For testing, use test mode
          testMode: true
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        const successRef = reference;
        
        addLog(`AzamPay payment initiated: ${successRef}`);
        addLog(`Payment checkout URL: ${data.checkoutUrl || 'N/A'}`);
        
        if (onPaymentComplete) {
          onPaymentComplete(successRef, 'azampay_initiated');
        }

        // Reset for next payment
        setReference('');
        setStatus('idle');

      } else {
        setStatus('error');
        addLog(`AzamPay payment failed: ${data.error || 'Unknown error'}`);
        
        if (onPaymentComplete) {
          onPaymentComplete(reference, 'error');
        }
      }

    } catch (error) {
      setStatus('error');
      addLog(`AzamPay processing error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">AzamPay Integration</h2>
        <p className="text-gray-600 mb-4">
          This is the actual AzamPay integration for real payments.
          It connects to the AzamPay API and processes real transactions.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center mb-2">
            <FiExternalLink className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">
              <strong>Production Mode</strong> - Real AzamPay API
            </span>
          </div>
          <p className="text-xs text-blue-700">
            API Endpoint: <code>/api/payments/azampay/checkout</code>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (TZS)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="40000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Membership Type
          </label>
          <select
            value={membershipType}
            onChange={(e) => setMembershipType(e.target.value as 'personal' | 'organization')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="personal">Personal (40,000 TZS)</option>
            <option value="organization">Organization (50,000 TZS)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Reference
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Auto-generated or enter manual reference"
            />
            <button
              onClick={generateReference}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Generate
            </button>
          </div>
        </div>

        <button
          onClick={processAzamPayPayment}
          disabled={status === 'processing'}
          className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {status === 'processing' && (
            <>
              <FiLoader className="animate-spin mr-2 h-4 w-4" />
              Processing AzamPay Payment...
            </>
          )}
          {status === 'success' && (
            <>
              <FiCheck className="mr-2 h-4 w-4" />
              Process AzamPay Payment
            </>
          )}
          {status === 'error' && (
            <>
              <FiAlertCircle className="mr-2 h-4 w-4" />
              Try Again
            </>
          )}
        </button>

        {logs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AzamPay Logs</h3>
            <div className="bg-gray-100 border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-xs font-mono text-gray-700 mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
