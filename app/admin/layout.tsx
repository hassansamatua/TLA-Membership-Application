'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRealTimeContactCount } from '@/hooks/useRealTimeContactCount';
import {
  FiHome,
  FiUsers,
  FiFile,
  FiCalendar,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiExternalLink,
  FiUserPlus,
  FiCreditCard,
  FiFileText,
  FiAward,
  FiMail,
} from 'react-icons/fi';
import { FiBell } from 'react-icons/fi';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  console.log('[AdminLayout] Component rendering...');
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { contactCount, refetchContactCount } = useRealTimeContactCount();

  // Handle hydration
  useEffect(() => {
    console.log('[AdminLayout] Hydration effect triggered');
    setMounted(true);
  }, []);

  // Handle authentication redirects in useEffect
  useEffect(() => {
    console.log('[AdminLayout] Auth check - mounted:', mounted, 'isAuthLoading:', isAuthLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);
    if (!mounted || isAuthLoading) return;

    if (!isAuthenticated) {
      console.log('[AdminLayout] Not authenticated, redirecting to login');
      router.push('/auth/login');
      return;
    }

    if (!user?.isAdmin) {
      console.log('[AdminLayout] Not admin, checking approval status');
      // For non-admin users, check approval status
      if (!user?.isApproved) {
        console.log('[AdminLayout] User not approved, redirecting to pending approval');
        router.push('/auth/pending-approval');
      } else {
        console.log('[AdminLayout] User approved but not admin, redirecting to dashboard');
        router.push('/dashboard');
      }
      return;
    }

    console.log('[AdminLayout] User is authenticated admin, allowing access');
  }, [mounted, isAuthLoading, isAuthenticated, user, router]);

  const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: FiHome },
    { name: 'Member Management', href: '/admin/users', icon: FiUsers },
    { name: 'Card Management', href: '/admin/cards', icon: FiCreditCard },
    { name: 'Contact Submissions', href: '/admin/contact-submissions', icon: FiMail },
    { name: 'News', href: '/admin/news', icon: FiBell },
    { name: 'Content Management', href: '/admin/content', icon: FiFile },
    { name: 'Events', href: '/admin/events', icon: FiCalendar },
    { name: 'Reports', href: '/admin/reports', icon: FiBarChart2 },
    { name: 'View Site', href: '/', icon: FiExternalLink, external: true },
  ].map((item) => ({ ...item, label: item.name }));

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Failed to logout');
    }
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin (redirects will happen in useEffect)
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex dark:from-gray-950 dark:to-gray-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex-shrink-0 flex flex-col dark:bg-gray-900 dark:shadow-black/40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-center h-16 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex-shrink-0">
          <div className="text-center">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-xs text-emerald-100 mt-1">TLA Management</p>
          </div>
        </div>
        
        <nav className="mt-6 px-4 flex-1 overflow-y-auto pb-24">
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-gray-500">Main Menu</p>
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const showBadge = item.name === 'Contact Submissions' && contactCount > 0;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mb-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-emerald-500/20 dark:text-emerald-300'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
                target={item.external ? '_blank' : '_self'}
                rel={item.external ? 'noopener noreferrer' : ''}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="ml-3">{item.label}</span>
                </div>
                {showBadge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center animate-pulse">
                    {contactCount}
                    <span className="ml-1 text-xs">New</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-white/10">
          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-gray-500">
              Account
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200 group dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <div className="p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-red-100 group-hover:text-red-600 transition-colors dark:bg-white/5 dark:text-gray-400 dark:group-hover:bg-red-500/20 dark:group-hover:text-red-300">
              <FiLogOut className="h-4 w-4" />
            </div>
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-0 min-w-0 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden dark:border-white/10 dark:bg-gray-900">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-white/5"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Admin Panel</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">TLA Management System</p>
            </div>
            <div className="w-9" aria-hidden="true" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-slate-50 dark:bg-gray-950">
          {/* Sub-header strip with breadcrumb */}
          <div className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <nav className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
                <Link href="/admin" className="hover:text-emerald-700 dark:hover:text-emerald-400">Admin</Link>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="font-medium text-gray-700 capitalize dark:text-gray-200">
                  {pathname === '/admin'
                    ? 'Dashboard'
                    : (pathname.split('/').pop()?.replace('-', ' ') || 'Page')}
                </span>
              </nav>
              <div className="hidden items-center gap-2 text-xs text-gray-500 sm:flex dark:text-gray-400">
                Signed in as
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {user?.name || 'admin'}
                </span>
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
