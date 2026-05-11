'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMail, FiArrowLeft, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`Password reset code has been sent to ${email}.`);
        // Store email for potential redirect
        localStorage.setItem('resetEmail', email);
        // Show code entry form
        setShowCodeEntry(true);
      } else {
        setMessage(data.message || 'Failed to send reset code');
      }
    } catch (error) {
      setMessage('Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setMessage('Please enter your email address first');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`A new reset code has been sent to ${email}. Please check your email.`);
      } else {
        setMessage(data.message || 'Failed to resend reset code');
      }
    } catch (error) {
      setMessage('Failed to resend reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-green-600 rounded-full mb-8">
            <FiMail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h1>
          <p className="text-gray-600 mb-6">Enter your email address and we'll send you a code to reset your password.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-md mb-4 ${
            message.includes('sent') ? 'bg-green-50 border-green-200' : 
            message.includes('success') ? 'bg-blue-50 border-blue-200' : 
            message.includes('Failed') ? 'bg-red-50 border-red-200' : 
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center">
              {message.includes('success') && <FiCheck className="h-5 w-5 text-green-600 mr-2" />}
              {message.includes('Failed') && <FiAlertCircle className="h-5 w-5 text-red-600 mr-2" />}
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={isLoading || !email}
              className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md border border-transparent"
            >
              {isLoading ? (
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-500 border-white border-opacity-25"></div>
                  <span className="ml-2">Sending...</span>
                </div>
              ) : 'Send Reset Code'}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading || !email}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
            >
              <FiRefreshCw className="h-4 w-4 mr-2" />
              Resend Code
            </button>
          </div>
        </form>

        <div className="text-center mt-6 space-y-4">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Back to Login
          </button>
          
          {message.includes('sent') && (
            <div className="text-sm text-gray-600">
              <p>Once you receive the code, you can enter it below:</p>
            </div>
          )}
        </div>

        {/* Code Entry Form */}
        {showCodeEntry && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enter Reset Code</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reset Code
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
              
              <button
                onClick={() => {
                  if (resetCode.length === 6) {
                    router.push(`/auth/reset-password?email=${encodeURIComponent(email)}&code=${resetCode}`);
                  } else {
                    setMessage('Please enter a valid 6-digit code');
                  }
                }}
                className="w-full px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md border border-transparent"
              >
                Submit Code & Reset Password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
