"use client";

import { useState } from 'react';
import { FiCreditCard, FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi';

interface TestingPaymentProps {
  amount: number;
  membershipType: 'personal' | 'organization';
  onPaymentComplete?: (reference: string, status: string) => void;
}

export default function TestingPaymentGateway({ amount, membershipType, onPaymentComplete }: TestingPaymentProps) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [reference, setReference] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [currentAmount, setCurrentAmount] = useState<number>(amount);
  const [currentMembershipType, setCurrentMembershipType] = useState<'personal' | 'organization'>(membershipType);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const generateReference = () => {
    const ref = 'TEST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    setReference(ref);
    return ref;
  };

  const processTestPayment = async () => {
    if (!reference) {
      addLog('Error: Please enter a reference first');
      return;
    }

    setStatus('processing');
    addLog(`Processing test payment: ${reference}`);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate successful payment
      setStatus('success');
      const successRef = reference;
      
      addLog(`Payment processed successfully: ${successRef}`);
      
      if (onPaymentComplete) {
        onPaymentComplete(successRef, 'success');
      }

      // Reset for next payment
      setReference('');
      setStatus('idle');

    } catch (error) {
      setStatus('error');
      addLog(`Payment processing error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Testing Payment Gateway</h2>
        <p className="text-gray-600 mb-4">
          This is a testing payment gateway for development purposes only.
          It simulates payment processing without real transactions.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (TZS)
          </label>
          <input
            type="number"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="40000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Membership Type
          </label>
          <select
            value={currentMembershipType}
            onChange={(e) => setCurrentMembershipType(e.target.value as 'personal' | 'organization')}
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
          onClick={processTestPayment}
          disabled={status === 'processing'}
          className="w-full flex items-center justify-center px-4 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {status === 'processing' && (
            <>
              <FiLoader className="animate-spin mr-2 h-4 w-4" />
              Processing...
            </>
          )}
          {status === 'success' && (
            <>
              <FiCheck className="mr-2 h-4 w-4" />
              Process Test Payment
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Logs</h3>
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
