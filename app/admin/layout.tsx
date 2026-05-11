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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin (redirects will happen in useEffect)
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex-shrink-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-center h-16 bg-gradient-to-r from-green-600 to-green-700 text-white flex-shrink-0">
          <div className="text-center">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-xs text-green-100 mt-1">TLA Management</p>
          </div>
        </div>
        
        <nav className="mt-6 px-4 flex-1 overflow-y-auto pb-24">
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</p>
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
                    ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                }`}
                onClick={() => setSidebarOpen(false)}
                target={item.external ? '_blank' : '_self'}
                rel={item.external ? 'noopener noreferrer' : ''}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200 group"
          >
            <div className="p-2 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
              <FiLogOut className="h-4 w-4" />
            </div>
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-0 min-w-0 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800">Admin Panel</h2>
              <p className="text-xs text-gray-500">TLA Management System</p>
            </div>
            <div className="w-9"></div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {pathname === '/admin' ? 'Dashboard' : 
                     (pathname.split('/').pop()?.charAt(0)?.toUpperCase() || '') + (pathname.split('/').pop()?.slice(1) || '') || 'Admin'}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {pathname === '/admin' ? 'Welcome back to your admin dashboard' : 
                     `Manage ${(pathname.split('/').pop()?.replace('-', ' ') || 'content')}`}
                  </p>
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>Admin</span>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">
                      {pathname === '/admin' ? 'Dashboard' : (pathname.split('/').pop()?.replace('-', ' ') || 'Admin')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
