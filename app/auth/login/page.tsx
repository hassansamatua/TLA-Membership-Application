// app/auth/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { ThemeToggle } from "@/components/ui";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 dark:from-gray-950 dark:via-gray-950 dark:to-emerald-950/30">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-white/10">
            <Image
              src="/logo.png"
              alt="Tanzania Library Association"
              width={48}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
            Tanzania Library Association
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign in to access your member dashboard.
          </p>
        </div>

        {registered && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Registration successful — please sign in below.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                isLoading ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            New to TLA?
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <Link
            href="/auth/register"
            className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Apply for membership
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By signing in you agree to TLA's terms of service and privacy policy.
        </p>
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