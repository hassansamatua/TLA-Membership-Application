"use client";

import { useState } from 'react';
import { FiSmartphone, FiCreditCard, FiCheck } from 'react-icons/fi';
import { PaymentLogos } from './PaymentLogos';

interface PaymentMethod {
  id: string;
  name: string;
  displayName: string;
  description: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'azampesa',
    name: 'azampesa',
    displayName: 'AzamPesa',
    description: 'Pay using AzamPesa mobile money'
  },
  {
    id: 'mpesa',
    name: 'mpesa',
    displayName: 'M-Pesa',
    description: 'Pay using M-Pesa mobile money'
  },
  {
    id: 'halopesa',
    name: 'halopesa',
    displayName: 'HaloPesa',
    description: 'Pay using HaloPesa mobile money'
  },
  {
    id: 'airtelmoney',
    name: 'airtelmoney',
    displayName: 'Airtel Money',
    description: 'Pay using Airtel Money mobile money'
  },
  {
    id: 'tigopesa',
    name: 'tigopesa',
    displayName: 'Tigo Pesa',
    description: 'Pay using Tigo Pesa mobile money'
  },
  {
    id: 'bankcard',
    name: 'bankcard',
    displayName: 'Bank Card',
    description: 'Pay using Visa, Mastercard, or other bank cards'
  }
];

interface PaymentMethodSelectorProps {
  selectedMethod: string | null;
  onMethodSelect: (method: string) => void;
  amount: number;
}

export default function PaymentMethodSelector({ selectedMethod, onMethodSelect, amount }: PaymentMethodSelectorProps) {
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Payment Method</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods.map((method) => {
          const logo = PaymentLogos[method.id as keyof typeof PaymentLogos];
          return (
            <button
              key={method.id}
              onClick={() => onMethodSelect(method.id)}
              onMouseEnter={() => setHoveredMethod(method.id)}
              onMouseLeave={() => setHoveredMethod(null)}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedMethod === method.id
                  ? 'border-green-500 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Selection indicator */}
              {selectedMethod === method.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <FiCheck className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center space-y-3">
                {/* Logo */}
                <div className={`relative transition-transform ${selectedMethod === method.id ? 'scale-110' : ''}`}>
                  <img
                    src={logo.image}
                    alt={logo.alt}
                    className="w-16 h-10 object-contain"
                  />
                </div>

                {/* Provider name */}
                <div className="text-center">
                  <h4 className="font-semibold" style={{ color: logo.color }}>
                    {method.displayName}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {method.description}
                  </p>
                </div>

                {/* Hover effect background */}
                {hoveredMethod === method.id && selectedMethod !== method.id && (
                  <div 
                    className="absolute inset-0 opacity-10 rounded-lg pointer-events-none" 
                    style={{ backgroundColor: logo.bgColor }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected method details */}
      {selectedMethod && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <FiSmartphone className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                Selected: {paymentMethods.find(m => m.id === selectedMethod)?.displayName}
              </p>
              <p className="text-sm text-green-600">
                Amount: TZS {amount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment instructions */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <FiCreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Secure Payment</p>
            <p className="text-sm text-blue-600 mt-1">
              You will be redirected to a secure payment page to complete your transaction. 
              Your payment information is encrypted and protected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
