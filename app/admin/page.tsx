'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiUsers, FiCalendar, FiCreditCard, FiFileText, FiSettings, FiActivity } from 'react-icons/fi';

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalPayments: 0,
    totalReports: 0,
    pendingApprovals: 0,
    activeMembers: 0,
    expiredMembers: 0
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchStats();
    }
  }, [isAuthenticated, user]);

  const fetchStats = async () => {
    try {
      const [usersRes, eventsRes, paymentsRes, reportsRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/events', { credentials: 'include' }),
        fetch('/api/payments', { credentials: 'include' }),
        fetch('/api/reports', { credentials: 'include' })
      ]);

      const users = usersRes.ok ? await usersRes.json() : [];
      const events = eventsRes.ok ? await eventsRes.json() : [];
      const payments = paymentsRes.ok ? await paymentsRes.json() : [];
      const reports = reportsRes.ok ? await reportsRes.json() : [];

      console.log('API Results:', {
        users: users,
        events: events,
        payments: payments,
        reports: reports
      });

      // Calculate expired members
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      console.log('Current month:', currentMonth, 'Current year:', currentYear);
      
      const expiredMembers = Array.isArray(users) ? users.filter((u: any) => {
        // Check if user has expired membership
        const joinDate = new Date(u.created_at || u.join_date);
        
        // If we're past March and user hasn't paid for current year, they're expired
        if (currentMonth > 2) { // After March
          // Check if user has any payment for current year
          const hasCurrentYearPayment = payments.some((p: any) => 
            p.user_id === u.id && p.payment_year === currentYear
          );
          const isExpired = u.isApproved && !hasCurrentYearPayment;
          console.log(`User ${u.id} (${u.name}): isApproved=${u.isApproved}, hasPayment=${hasCurrentYearPayment}, expired=${isExpired}`);
          return isExpired;
        }
        
        return false;
      }).length : 0;
      
      console.log('Final expired members count:', expiredMembers);

      setStats({
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalEvents: Array.isArray(events) ? events.length : 0,
        totalPayments: Array.isArray(payments) ? payments.length : 0,
        totalReports: Array.isArray(reports) ? reports.length : 0,
        pendingApprovals: Array.isArray(users) ? users.filter((u: any) => !u.isApproved).length : 0,
        activeMembers: Array.isArray(users) ? users.filter((u: any) => u.isApproved).length : 0,
        expiredMembers
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-blue-100 text-lg">Welcome back, {user.name}!</p>
              <p className="text-blue-200 text-sm mt-1">Here's what's happening with your TLA membership system today</p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-3xl font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-xl">{new Date().getDate()}</div>
                <div className="text-sm">{new Date().toLocaleDateString('en-US', { month: 'short' })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Registered members</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <FiUsers className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <div className="h-2 bg-gradient-to-r from-green-500 to-green-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Members</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.activeMembers}</p>
                <p className="text-xs text-gray-500 mt-1">Currently active</p>
              </div>
              <div className="p-4 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                <FiActivity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <div className="h-2 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pending Approvals</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{stats.pendingApprovals}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
              </div>
              <div className="p-4 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                <FiUsers className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Events</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stats.totalEvents}</p>
                <p className="text-xs text-gray-500 mt-1">Scheduled events</p>
              </div>
              <div className="p-4 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <FiCalendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Payments</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{stats.totalPayments}</p>
                <p className="text-xs text-gray-500 mt-1">Payment records</p>
              </div>
              <div className="p-4 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                <FiCreditCard className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <div className="h-2 bg-gradient-to-r from-red-500 to-red-600"></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Reports</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">{stats.totalReports}</p>
                <p className="text-xs text-gray-500 mt-1">Generated reports</p>
              </div>
              <div className="p-4 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
                <FiFileText className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500"></div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Expired Members</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">{stats.expiredMembers}</p>
                <p className="text-xs text-gray-500 mt-1">Need renewal</p>
              </div>
              <div className="p-4 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
                <FiActivity className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          <p className="text-gray-600 text-sm mt-1">Common tasks and management tools</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/admin/users')}
            className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <div className="relative z-10">
              <FiUsers className="h-8 w-8 mb-3" />
              <div className="font-semibold">Manage Users</div>
              <div className="text-xs text-blue-100 mt-1">View and edit members</div>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
          <button
            onClick={() => router.push('/admin/events')}
            className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <div className="relative z-10">
              <FiCalendar className="h-8 w-8 mb-3" />
              <div className="font-semibold">Manage Events</div>
              <div className="text-xs text-purple-100 mt-1">Create and edit events</div>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
          <button
            onClick={() => router.push('/admin/payments')}
            className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <div className="relative z-10">
              <FiCreditCard className="h-8 w-8 mb-3" />
              <div className="font-semibold">Manage Payments</div>
              <div className="text-xs text-green-100 mt-1">View payment history</div>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
          <button
            onClick={() => router.push('/admin/users?tab=expired')}
            className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-6 hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <div className="relative z-10">
              <FiActivity className="h-8 w-8 mb-3" />
              <div className="font-semibold">Expired Members</div>
              <div className="text-xs text-orange-100 mt-1">Renewal management</div>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
