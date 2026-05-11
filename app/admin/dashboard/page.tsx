// app/admin/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChartComponent, fetchReportChartData, processDataForChart } from './charts';
import { FiRefreshCw, FiBarChart2, FiPieChart, FiUsers, FiDollarSign, FiCalendar, FiTrendingUp } from 'react-icons/fi';

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<Record<string, any>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedCharts, setSelectedCharts] = useState({
    users: true,
    payments: true,
    events: true,
    membership: true,
  });

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated && user && !user.isAdmin) {
      router.push('/dashboard');
      return;
    }

    // Fetch dashboard data
    loadDashboardData();
  }, [user, isAuthenticated, isLoading, router]);

  const loadDashboardData = async () => {
    setIsLoadingData(true);
    try {
      const reportTypes = ['users', 'payments', 'events', 'membership'];
      const data: Record<string, any> = {};

      for (const type of reportTypes) {
        const reportData = await fetchReportChartData(type);
        data[type] = reportData;
      }

      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoading || !isAuthenticated || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const getChartableField = (data: any[], reportType: string): string => {
    if (!data || data.length === 0) return '';
    const firstRow = data[0];
    const fields = Object.keys(firstRow).filter(key => {
      const value = firstRow[key];
      return (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
             !key.toLowerCase().includes('id') &&
             String(value).length < 100;
    });
    return fields.length > 0 ? fields[0] : '';
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time reports and analytics with visual data representations</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiRefreshCw className="mr-2" />
            Refresh Data
          </button>
        </div>

        {/* Chart Selection Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Display Charts</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'users', label: 'Users', icon: FiUsers },
              { key: 'payments', label: 'Payments', icon: FiDollarSign },
              { key: 'events', label: 'Events', icon: FiCalendar },
              { key: 'membership', label: 'Membership', icon: FiTrendingUp },
            ].map(({ key, label, icon: Icon }) => (
              <label key={key} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedCharts[key as keyof typeof selectedCharts]}
                  onChange={(e) => setSelectedCharts({ ...selectedCharts, [key]: e.target.checked })}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <Icon className="ml-2 h-5 w-5 text-gray-600" />
                <span className="ml-2 font-medium text-gray-900">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        {isLoadingData ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {selectedCharts.users && dashboardData.users && dashboardData.users.length > 0 && (
              <>
                <ChartComponent
                  title="Users by Status"
                  data={processDataForChart(dashboardData.users, getChartableField(dashboardData.users, 'users') || 'status', 'pie') || {}}
                  type="pie"
                  height={350}
                />
                <ChartComponent
                  title="Users Distribution"
                  data={processDataForChart(dashboardData.users, getChartableField(dashboardData.users, 'users') || 'status', 'bar') || {}}
                  type="bar"
                  height={350}
                />
              </>
            )}

            {selectedCharts.payments && dashboardData.payments && dashboardData.payments.length > 0 && (
              <>
                <ChartComponent
                  title="Payments by Status"
                  data={processDataForChart(dashboardData.payments, getChartableField(dashboardData.payments, 'payments') || 'status', 'doughnut') || {}}
                  type="doughnut"
                  height={350}
                />
                <ChartComponent
                  title="Payments Trend"
                  data={processDataForChart(dashboardData.payments, getChartableField(dashboardData.payments, 'payments') || 'status', 'line') || {}}
                  type="line"
                  height={350}
                />
              </>
            )}

            {selectedCharts.events && dashboardData.events && dashboardData.events.length > 0 && (
              <>
                <ChartComponent
                  title="Events Distribution"
                  data={processDataForChart(dashboardData.events, getChartableField(dashboardData.events, 'events') || 'status', 'bar') || {}}
                  type="bar"
                  height={350}
                />
                <ChartComponent
                  title="Events by Type"
                  data={processDataForChart(dashboardData.events, getChartableField(dashboardData.events, 'events') || 'status', 'pie') || {}}
                  type="pie"
                  height={350}
                />
              </>
            )}

            {selectedCharts.membership && dashboardData.membership && dashboardData.membership.length > 0 && (
              <>
                <ChartComponent
                  title="Membership Status"
                  data={processDataForChart(dashboardData.membership, getChartableField(dashboardData.membership, 'membership') || 'status', 'doughnut') || {}}
                  type="doughnut"
                  height={350}
                />
                <ChartComponent
                  title="Membership Breakdown"
                  data={processDataForChart(dashboardData.membership, getChartableField(dashboardData.membership, 'membership') || 'type', 'bar') || {}}
                  type="bar"
                  height={350}
                />
              </>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          {[
            { label: 'Total Users', value: dashboardData.users?.length || 0, icon: FiUsers, color: 'blue' },
            { label: 'Total Payments', value: dashboardData.payments?.length || 0, icon: FiDollarSign, color: 'green' },
            { label: 'Total Events', value: dashboardData.events?.length || 0, icon: FiCalendar, color: 'purple' },
            { label: 'Memberships', value: dashboardData.membership?.length || 0, icon: FiTrendingUp, color: 'yellow' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                </div>
                <Icon className={`h-12 w-12 text-${color}-600 opacity-50`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}