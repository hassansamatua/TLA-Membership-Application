"use client";

import { useState } from 'react';
import { FiPhone, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface PhoneNumberInputProps {
  paymentMethod: string;
  onPhoneNumberSubmit: (phoneNumber: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const mobileNetworkConfigs = {
  azampesa: {
    name: 'AzamPesa',
    prefix: ['065', '067', '068', '071', '074'],
    format: '0XXXXXXXXX',
    example: '0652542346'
  },
  mpesa: {
    name: 'M-Pesa',
    prefix: ['075', '076', '077', '078'],
    format: '0XXXXXXXXX',
    example: '0752542346'
  },
  halopesa: {
    name: 'HaloPesa',
    prefix: ['062', '063', '064', '069'],
    format: '0XXXXXXXXX',
    example: '0622542346'
  },
  airtelmoney: {
    name: 'Airtel Money',
    prefix: ['068', '069', '078', '079'],
    format: '0XXXXXXXXX',
    example: '0782542346'
  },
  tigopesa: {
    name: 'Tigo Pesa',
    prefix: ['065', '067', '071', '072'],
    format: '0XXXXXXXXX',
    example: '0712542346'
  },
  bankcard: {
    name: 'Bank Card',
    prefix: [],
    format: 'Card Number',
    example: '1234 5678 9012 3456'
  }
};

export default function PhoneNumberInput({ 
  paymentMethod, 
  onPhoneNumberSubmit, 
  onCancel, 
  disabled = false 
}: PhoneNumberInputProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<{ phone?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const config = mobileNetworkConfigs[paymentMethod as keyof typeof mobileNetworkConfigs];

  const validatePhoneNumber = (phone: string): boolean => {
    if (paymentMethod === 'bankcard') {
      // Basic card validation (16 digits, spaces allowed)
      const cleanCard = phone.replace(/\s/g, '');
      return /^\d{16}$/.test(cleanCard);
    }

    // Mobile money validation - exactly 10 digits starting with 0
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10) return false;
    if (!cleanPhone.startsWith('0')) return false;
    
    const networkCode = cleanPhone.substring(0, 3);
    return config.prefix.includes(networkCode);
  };

  const handlePhoneSubmit = async () => {
    setErrors({});
    
    if (!validatePhoneNumber(phoneNumber)) {
      setErrors({ 
        phone: paymentMethod === 'bankcard' 
          ? 'Please enter a valid 16-digit card number'
          : `Please enter a valid ${config.name} number starting with ${config.prefix.join(', ')}`
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate validation delay
    setTimeout(() => {
      setIsLoading(false);
      // Submit phone number and trigger payment
      onPhoneNumberSubmit(phoneNumber);
    }, 1000);
  };

  const formatPhoneNumber = (value: string) => {
    if (paymentMethod === 'bankcard') {
      // Format card number with spaces
      const clean = value.replace(/\D/g, '');
      const chunks = clean.match(/.{1,4}/g) || [];
      return chunks.join(' ');
    }
    
    // Mobile money format - only allow digits, max 10
    return value.replace(/\D/g, '').slice(0, 10);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Enter {config.name} Details
        </h3>
        <p className="text-sm text-gray-600">
          {paymentMethod === 'bankcard' 
            ? 'Enter your card details to proceed with payment'
            : 'Enter your mobile money number to proceed with payment'
          }
        </p>
      </div>

      {/* Phone Number Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {paymentMethod === 'bankcard' ? 'Card Number' : 'Phone Number'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiPhone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={paymentMethod === 'bankcard' ? 'text' : 'tel'}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
              placeholder={paymentMethod === 'bankcard' ? '1234 5678 9012 3456' : '0652542346'}
              className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={paymentMethod === 'bankcard' ? 19 : 10}
            />
          </div>
          {errors.phone && (
            <div className="flex items-center mt-2 text-red-600 text-sm">
              <FiAlertCircle className="h-4 w-4 mr-1" />
              {errors.phone}
            </div>
          )}
        </div>

        {/* Format Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FiPhone className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Format Information</p>
              <p className="text-sm text-blue-600 mt-1">
                {paymentMethod === 'bankcard' 
                  ? 'Enter your 16-digit card number'
                  : `Format: ${config.format} (e.g., ${config.example})`
                }
              </p>
              {paymentMethod !== 'bankcard' && (
                <p className="text-sm text-blue-600 mt-1">
                  Must start with 0 and be exactly 10 digits
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Money Notice */}
        {paymentMethod !== 'bankcard' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FiCheck className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Mobile Money Payment</p>
                <p className="text-sm text-green-600 mt-1">
                  After entering your number, you'll be redirected to AzamPay.
                  Your {config.name} app will show a payment prompt to confirm the transaction.
                </p>
                <p className="text-sm text-green-600 mt-1">
                  No PIN entry required in this system - all security happens on your phone.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={handlePhoneSubmit}
          disabled={isLoading || !phoneNumber || disabled}
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Processing...
            </span>
          ) : (
            'Continue to Payment'
          )}
        </button>
      </div>
    </div>
  );
}
