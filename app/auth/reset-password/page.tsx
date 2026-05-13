'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiMail, FiArrowLeft, FiCheck, FiAlertCircle, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [isAutoVerified, setIsAutoVerified] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-verify function - defined before useState
  const handleAutoVerify = async (email: string, code: string) => {
    if (!email || !code) return;
    
    try {
      const response = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, resetCode: code }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsCodeVerified(true);
        setIsAutoVerified(true);
        setMessage('Reset code verified! Please enter your new password.');
      } else {
        setMessage(data.message || 'Invalid reset code');
      }
    } catch (error) {
      setMessage('Failed to verify reset code. Please try again.');
    }
  };

  // Get email and code from URL if provided
  useState(() => {
    const emailFromUrl = searchParams.get('email');
    const codeFromUrl = searchParams.get('code');
    
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
    if (codeFromUrl) {
      setResetCode(codeFromUrl);
      // Auto-verify code if provided in URL
      handleAutoVerify(emailFromUrl || '', codeFromUrl);
    }
  });

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !resetCode) {
      setMessage('Please enter both email and reset code');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/forgot-password/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, resetCode }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsCodeVerified(true);
        setMessage('Reset code verified! Please enter your new password.');
      } else {
        setMessage(data.message || 'Invalid reset code');
      }
    } catch (error) {
      setMessage('Failed to verify reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !resetCode || !newPassword || !confirmPassword) {
      setMessage('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, resetCode, newPassword }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Password has been reset successfully!');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        setMessage(data.message || 'Failed to reset password');
      }
    } catch (error) {
      setMessage('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-emerald-600 rounded-full mb-8">
            <FiLock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600 mb-6">
            {isCodeVerified 
              ? 'Enter your new password below' 
              : resetCode 
                ? 'Verify the reset code and enter your new password'
                : 'Enter your email and the reset code sent to your email'
            }
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-md mb-4 ${
            message.includes('verified') ? 'bg-emerald-50 border-emerald-200' : 
            message.includes('success') ? 'bg-blue-50 border-blue-200' : 
            message.includes('Failed') || message.includes('Invalid') || message.includes('expired') ? 'bg-red-50 border-red-200' : 
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center">
              {message.includes('verified') && <FiCheck className="h-5 w-5 text-emerald-600 mr-2" />}
              {message.includes('success') && <FiCheck className="h-5 w-5 text-blue-600 mr-2" />}
              {(message.includes('Failed') || message.includes('Invalid') || message.includes('expired')) && <FiAlertCircle className="h-5 w-5 text-red-600 mr-2" />}
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        {!isCodeVerified ? (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reset Code
              </label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !email || !resetCode}
                className="w-full px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md border border-transparent"
              >
                {isLoading ? (
                  <div className="inline-flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500 border-white border-opacity-25"></div>
                    <span className="ml-2">Verifying...</span>
                  </div>
                ) : 'Verify Reset Code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5 text-gray-400" /> : <FiEye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center"
                >
                  {showConfirmPassword ? <FiEyeOff className="h-5 w-5 text-gray-400" /> : <FiEye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md border border-transparent"
              >
                {isLoading ? (
                  <div className="inline-flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500 border-white border-opacity-25"></div>
                    <span className="ml-2">Resetting...</span>
                  </div>
                ) : 'Reset Password'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-6 space-y-2">
          {!isCodeVerified && (
            <button
              onClick={() => router.push('/auth/forgot-password')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Request New Code
            </button>
          )}
          <button
            onClick={() => router.push('/auth/login')}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
