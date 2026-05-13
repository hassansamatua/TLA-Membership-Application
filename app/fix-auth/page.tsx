'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function FixAuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  const handleFixAuth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/setup/ensure-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ensure-admin' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Fix failed');
      }

      setResult(data);
      toast.success('Authentication fixed successfully!');
      
      // Clear cookies and redirect to login
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);

    } catch (error) {
      console.error('Fix error:', error);
      toast.error(error instanceof Error ? error.message : 'Fix failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Fix Authentication
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Fix authentication issues by ensuring admin user exists
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <button
                onClick={handleFixAuth}
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Fixing...' : 'Fix Authentication'}
              </button>
            </div>

            {result && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-md">
                <h3 className="text-sm font-medium text-emerald-800">Fix Complete!</h3>
                <div className="mt-2 text-sm text-emerald-700">
                  <p>✅ {result.message}</p>
                  {result.credentials && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm font-medium text-yellow-800">Login Credentials:</p>
                      <div className="mt-1 text-xs text-yellow-700">
                        <p><strong>Email:</strong> {result.credentials.email}</p>
                        <p><strong>Password:</strong> {result.credentials.password}</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-sm text-emerald-600">
                  Redirecting to login page in 2 seconds...
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">What this fix does</span>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <ul className="list-disc list-inside space-y-1">
                <li>Checks if admin user exists in database</li>
                <li>Creates admin user if it doesn't exist</li>
                <li>Fixes authentication token issues</li>
                <li>Clears cookies for fresh login</li>
                <li>Redirects to login page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
