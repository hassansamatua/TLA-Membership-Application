"use client";

import { useState } from 'react';
import { FiPhone, FiAlertCircle } from 'react-icons/fi';

interface SimplePhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  required?: boolean;
  error?: string;
}

export default function SimplePhoneInput({ 
  value, 
  onChange, 
  label, 
  placeholder, 
  required = false,
  error 
}: SimplePhoneInputProps) {
  const [touched, setTouched] = useState(false);

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters
    const cleaned = input.replace(/\D/g, '');
    
    // Format as +255 XXX XXX XXX if starts with 255 or 0
    if (cleaned.startsWith('255') && cleaned.length <= 12) {
      if (cleaned.length <= 3) return `+${cleaned}`;
      if (cleaned.length <= 6) return `+${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
      if (cleaned.length <= 9) return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 12)}`;
    }
    
    // Handle local format (starts with 0)
    if (cleaned.startsWith('0') && cleaned.length <= 10) {
      return cleaned;
    }
    
    // Return cleaned digits or original if no match
    return cleaned.slice(0, 12);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid Tanzania number
    if (cleaned.startsWith('255')) {
      return cleaned.length === 12;
    }
    
    if (cleaned.startsWith('0')) {
      return cleaned.length === 10;
    }
    
    return false;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const showError = touched && error;
  const isValid = value && validatePhoneNumber(value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiPhone className={`h-5 w-5 ${showError ? 'text-red-500' : isValid ? 'text-emerald-500' : 'text-gray-400'}`} />
        </div>
        
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
            showError 
              ? 'border-red-500 bg-red-50' 
              : isValid 
                ? 'border-emerald-500 bg-emerald-50' 
                : 'border-gray-300'
          }`}
        />
        
        {isValid && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          </div>
        )}
      </div>
      
      {showError && (
        <div className="flex items-center text-red-600 text-sm">
          <FiAlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
      
      {!showError && value && (
        <p className="text-xs text-gray-500">
          Format: +255 XXX XXX XXX or 0XXXXXXXXX
        </p>
      )}
    </div>
  );
}
