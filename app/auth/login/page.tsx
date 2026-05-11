// app/auth/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const registered = searchParams.get("registered");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    console.log('[Login] Attempting login for email:', email);

    try {
      console.log('[Login] Calling login function...');
      const result = await login(email, password);
      
      if (result.requiresApproval) {
        console.log('[Login] User requires approval, redirecting to pending page');
        router.push('/auth/pending-approval');
        return;
      }

      const userData = result.user;
      if (!userData) {
        throw new Error('No user data received');
      }

      console.log('[Login] Login successful, user data:', {
        id: userData.id,
        email: userData.email,
        isAdmin: userData.isAdmin,
        isApproved: userData.isApproved
      });
      
      // Show success message
      toast.success("Login successful! Redirecting...");

      // Use a small timeout to ensure toast is visible
      setTimeout(() => {
        console.log('[Login] About to redirect, user data:', userData);
        console.log('[Login] User isAdmin:', userData.isAdmin);
        if (userData.isAdmin) {
          console.log('[Login] Admin user detected, redirecting to /admin');
          // For admin, use window.location to ensure full page load
          window.location.href = '/admin';
        } else {
          console.log(`[Login] Regular user, redirecting to: ${redirect}`);
          // For regular users, use window.location to ensure full page load and state refresh
          console.log('[Login] Current window.location:', window.location.href);
          window.location.href = redirect;
        }
      }, 1000);

    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md w-full p-8 mx-auto mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
          <div className="mt-6 flex justify-center">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={96}
              height={96}
              className="h-24 w-auto"
              priority
              onError={(e) => {
                console.error('Logo failed to load:', e);
              }}
            />
          </div>
          {registered && (
            <p className="mt-4 text-green-700">
              Registration successful! Please log in.
            </p>
          )}
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            {error}
          </div>
        )}

        <div className="bg-white p-8 shadow-lg rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="text-sm">
                  <p className="text-gray-600 mb-4">
                    <Link 
                      href="/auth/forgot-password" 
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Forgot your password?
                    </Link>
                  </p>
                </div>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/auth/register"
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Apply Membership
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}