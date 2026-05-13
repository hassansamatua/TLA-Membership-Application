"use client";

import { useState } from 'react';
import { FiSmartphone, FiCreditCard, FiCheck } from 'react-icons/fi';
import { PaymentLogos } from './PaymentLogos';

interface PaymentMethod {
  id: string;
  name: string;
  displayName: string;
  description: string;
  image: string;
  color: string;
  bgColor: string;
  alt: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'azampesa',
    name: 'azampesa',
    displayName: 'AzamPesa',
    description: 'Pay using AzamPesa mobile money',
    image: '/azampesa.jpg',
    color: '#0052CC',
    bgColor: '#E8F2FF',
    alt: 'AzamPesa Logo'
  },
  {
    id: 'mpesa',
    name: 'mpesa',
    displayName: 'M-Pesa',
    description: 'Pay using M-Pesa mobile money',
    image: '/mpesa.jpg',
    color: '#35B039',
    bgColor: '#E8F5E8',
    alt: 'M-Pesa Logo'
  },
  {
    id: 'halopesa',
    name: 'halopesa',
    displayName: 'HaloPesa',
    description: 'Pay using HaloPesa mobile money',
    image: '/halopesa.png',
    color: '#8B3A9C',
    bgColor: '#F5EBF7',
    alt: 'HaloPesa Logo'
  },
  {
    id: 'airtelmoney',
    name: 'airtelmoney',
    displayName: 'Airtel Money',
    description: 'Pay using Airtel Money mobile money',
    image: '/airtelmoney.jpg',
    color: '#ED1C24',
    bgColor: '#FFEBEE',
    alt: 'Airtel Money Logo'
  },
  {
    id: 'mixxbyyas',
    name: 'mixxbyyas',
    displayName: 'Mixx By Yas',
    description: 'Pay using Mixx By Yas',
    image: '/mixxbyyas.png',
    color: '#00A6CE',
    bgColor: '#E8F7FA',
    alt: 'Mixx By Yas Logo'
  },
  {
    id: 'bankcard',
    name: 'bankcard',
    displayName: 'Bank Card',
    description: 'Pay using Visa, Mastercard, or other bank cards',
    image: '/bankcard.svg',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    alt: 'Bank Card Logo'
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
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Payment Method</h3>
      
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
                  ? 'border-emerald-500 shadow-lg transform scale-105'
                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:border-white/15 hover:shadow-md'
              }`}
            >
              {/* Selection indicator */}
              {selectedMethod === method.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <FiCheck className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center space-y-3">
                {/* Logo with safety check */}
                {logo && (
                  <div className={`relative transition-transform ${selectedMethod === method.id ? 'scale-110' : ''}`}>
                    <img
                      src={logo.image}
                      alt={logo.alt}
                      className="w-16 h-10 object-contain"
                    />
                  </div>
                )}

                {/* Provider name */}
                <div className="text-center">
                  <h4 className="font-semibold" style={{ color: logo?.color }}>
                    {method.displayName}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-1">
                    {method.description}
                  </p>
                </div>

                {/* Hover effect background */}
                {logo && hoveredMethod === method.id && selectedMethod !== method.id && (
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
        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <FiSmartphone className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-300">
                Selected: {paymentMethods.find(m => m.id === selectedMethod)?.displayName}
              </p>
              <p className="text-sm text-emerald-600">
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
