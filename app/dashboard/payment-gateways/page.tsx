"use client";

import { useState } from 'react';
import TestingPaymentGateway from '@/components/TestingPaymentGateway';
import AzamPayIntegration from '@/components/AzamPayIntegration';

export default function PaymentGatewaysPage() {
  const [gateway, setGateway] = useState<'testing' | 'azampay'>('testing');
  const [amount, setAmount] = useState<number>(40000);
  const [membershipType, setMembershipType] = useState<'personal' | 'organization'>('personal');

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Payment Gateway Testing
            </h1>
            
            <div className="mb-8">
              <div className="flex justify-center space-x-4 mb-8">
                <button
                  onClick={() => setGateway('testing')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    gateway === 'testing' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Testing Gateway
                </button>
                <button
                  onClick={() => setGateway('azampay')}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    gateway === 'azampay' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  AzamPay Integration
                </button>
              </div>

              <div className="flex justify-center space-x-4 mb-8">
                <button
                  onClick={() => setMembershipType('personal')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    membershipType === 'personal' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Personal (40,000 TZS)
                </button>
                <button
                  onClick={() => setMembershipType('organization')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    membershipType === 'organization' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Organization (50,000 TZS)
                </button>
              </div>

              <div className="flex justify-center mb-8">
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
            </div>

            {gateway === 'testing' && (
              <div className="border-t pt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Testing Payment Gateway</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="h-6 w-6 text-blue-600 mr-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 2 0 0 0 0 0-2 2v2a2 2 0 0 0 0 2 2v2a2 2 0 0 0 0-2 2V7a2 2 0 0 0 0-2 2v2a2 2 0 0 0 0-2 2V7a2 2 0 0 0 0-2 2v2a2 2 0 0 0 0-2 2V7a2 2 0 0 0 0-2 2V7a2 2 0 0 0 0-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm text-blue-800">
                      <strong>Testing Mode</strong> - Simulated payments
                    </span>
                  </div>
                  <p className="text-xs text-blue-700">
                    This gateway simulates payment processing without real transactions.
                    Use this for development and testing purposes only.
                  </p>
                </div>

                <TestingPaymentGateway
                  amount={amount}
                  membershipType={membershipType}
                  onPaymentComplete={(ref, status) => {
                    console.log(`Testing payment completed: ${ref} - ${status}`);
                  }}
                />
              </div>
            )}

            {gateway === 'azampay' && (
              <div className="border-t pt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">AzamPay Integration</h2>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="h-6 w-6 text-emerald-600 mr-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 2 0 0 0 0 0-2 2v2a2 2 0 0 0 0-2 2v2a2 2 0 0 0 0-2 2V7a2 2 0 0 0 0-2 2v2a2 2 0 0 0 0-2 2V7a2 2 0 0 0 0-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm text-emerald-800">
                      <strong>Production Mode</strong> - Real AzamPay API
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    This gateway connects to the actual AzamPay API for real payment processing.
                    Use this for production payments with real transactions.
                  </p>
                </div>

                <AzamPayIntegration
                  amount={amount}
                  membershipType={membershipType}
                  onPaymentComplete={(ref, status) => {
                    console.log(`AzamPay payment completed: ${ref} - ${status}`);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
