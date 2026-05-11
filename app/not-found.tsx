"use client";

import Link from 'next/link';
import { FiAlertTriangle, FiHome, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
            <FiAlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mt-2 text-3xl font-extrabold text-gray-900">Page Not Found</h2>
        
        <p className="mt-4 text-lg text-gray-600">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={handleGoBack}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <FiArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </button>
          
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
          >
            <FiHome className="mr-2 h-5 w-5" />
            Go to Homepage
          </Link>
          
          <Link 
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors duration-200"
          >
            Contact Support
            <FiArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
        
        <p className="mt-8 text-sm text-gray-500">
          Or go back to <Link href="/" className="font-medium text-green-600 hover:text-green-500">our homepage</Link>
        </p>
      </div>
    </div>
  );
}
