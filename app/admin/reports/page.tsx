'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiSearch,
  FiDownload,
  FiFilter,
  FiFileText,
  FiBarChart2,
  FiUsers,
  FiDollarSign,
  FiTrendingUp,
  FiActivity,
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface ReportData {
  totalMembers: number;
  activeMembers: number;
  totalRevenue: number;
  renewalRate: number;
  membershipTypes: Array<{
    type: string;
    count: number;
  }>;
  monthlySignups: Array<{
    month: string;
    count: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [membershipAnalytics, setMembershipAnalytics] = useState<any>(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState<any>(null);
  const [activityAnalytics, setActivityAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!user || !isAdmin) {
      router.push('/login');
      return;
    }
    fetchAllData();
  }, [user, isAdmin, period]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, membershipRes, paymentRes, activityRes] = await Promise.all([
        fetch('/api/admin/reports/summary'),
        fetch(`/api/admin/reports/membership?period=${period}`),
        fetch(`/api/admin/reports/payments?period=${period}`),
        fetch(`/api/admin/reports/activities?period=${period}`)
      ]);

      const summaryData = await summaryRes.json();
      const membershipData = await membershipRes.json();
      console.log('=== MEMBERSHIP API DEBUG ===');
      console.log('Membership response status:', membershipRes.status);
      console.log('Membership response ok:', membershipRes.ok);
      console.log('Membership Data received:', membershipData);
      console.log('Membership Data success:', membershipData.success);
      console.log('Membership Data data:', membershipData.data);
      console.log('Active members list:', membershipData.data?.activeMembersList);
      console.log('Active members list type:', typeof membershipData.data?.activeMembersList);
      console.log('Active members list length:', membershipData.data?.activeMembersList?.length);
      console.log('=== END MEMBERSHIP API DEBUG ===');
      
      const paymentData = await paymentRes.json();
      const activityData = await activityRes.json();

      console.log('Summary Data:', summaryData);
      console.log('Membership Data:', membershipData);
      console.log('Payment Data:', paymentData);
      console.log('Activity Data:', activityData);

      if (summaryData.success) setReportData(summaryData.data);
      if (membershipData.success) setMembershipAnalytics(membershipData.data);
      if (paymentData.success) setPaymentAnalytics(paymentData.data);
      if (activityData.success) setActivityAnalytics(activityData.data);
      
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Produce a real, multi-section CSV report from the in-memory analytics.
   * Sections: Summary, Membership types, Monthly signups, Payments,
   * Activities. Falls back gracefully when a section is missing. The old
   * implementation emitted raw JSON regardless of the requested format and
   * is replaced here.
   */
  const handleExport = (format: 'csv' | 'json') => {
    const today = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      // Keep a true JSON export available for debugging / data pipelines.
      const data = {
        generatedAt: new Date().toISOString(),
        summary: reportData,
        membership: membershipAnalytics,
        payments: paymentAnalytics,
        activities: activityAnalytics,
      };
      downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        `tla-report-${today}.json`
      );
      toast.success('Report exported as JSON');
      return;
    }

    const lines: string[] = [];
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const row = (...cells: unknown[]) => lines.push(cells.map(esc).join(','));

    row('Tanzania Library Association - Membership Report');
    row('Generated at', new Date().toISOString());
    row('Period', period);
    row();

    if (reportData) {
      row('SUMMARY');
      row('Metric', 'Value');
      row('Total Members', reportData.totalMembers);
      row('Active Members', reportData.activeMembers);
      row('Total Revenue (TZS)', reportData.totalRevenue);
      row('Renewal Rate (%)', reportData.renewalRate);
      row();

      if (reportData.membershipTypes?.length) {
        row('MEMBERSHIP TYPES');
        row('Type', 'Count');
        for (const t of reportData.membershipTypes) row(t.type || 'Unknown', t.count);
        row();
      }
      if (reportData.monthlySignups?.length) {
        row('MONTHLY SIGNUPS');
        row('Month', 'New Members');
        for (const m of reportData.monthlySignups) row(m.month, m.count);
        row();
      }
    }

    if (paymentAnalytics) {
      row('PAYMENTS');
      const summary = paymentAnalytics.summary || paymentAnalytics;
      for (const [k, v] of Object.entries(summary)) {
        if (typeof v === 'object' && v !== null) continue;
        row(k, v as any);
      }
      row();
      const breakdown =
        paymentAnalytics.byCycle ||
        paymentAnalytics.cyclePayments ||
        paymentAnalytics.byMonth ||
        paymentAnalytics.monthly ||
        [];
      if (Array.isArray(breakdown) && breakdown.length) {
        const keys = Object.keys(breakdown[0]);
        row('PAYMENT BREAKDOWN');
        row(...keys);
        for (const item of breakdown) row(...keys.map((k) => item[k]));
        row();
      }
    }

    if (membershipAnalytics?.activeMembersList?.length) {
      const list: any[] = membershipAnalytics.activeMembersList;
      const keys = Object.keys(list[0]);
      row('ACTIVE MEMBERS');
      row(...keys);
      for (const m of list) row(...keys.map((k) => m[k]));
      row();
    }

    if (activityAnalytics) {
      row('ACTIVITIES');
      const items =
        activityAnalytics.items ||
        activityAnalytics.activities ||
        activityAnalytics.recent ||
        [];
      if (Array.isArray(items) && items.length) {
        const keys = Object.keys(items[0]);
        row(...keys);
        for (const it of items) row(...keys.map((k) => it[k]));
      } else {
        for (const [k, v] of Object.entries(activityAnalytics)) {
          if (typeof v === 'object' && v !== null) continue;
          row(k, v as any);
        }
      }
      row();
    }

    downloadBlob(
      new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
      `tla-report-${period}-${today}.csv`
    );
    toast.success('Report exported as CSV');
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Professional Analytics Dashboard</h1>
              <p className="text-cyan-100 text-lg">Enterprise-grade analytics with Recharts visualization</p>
              <div className="flex items-center space-x-4 mt-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-sm font-medium">Period: {period}</span>
                </div>
                <div className="bg-emerald-400/30 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-sm font-medium">Live Data</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                <FiBarChart2 className="h-8 w-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">Analytics</div>
                <div className="text-sm">Real-time Reports</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-xl shadow-lg mb-6 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 rounded-xl shadow-sm text-sm font-medium transition-colors ${
                showFilters 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FiFilter className="mr-2" />
              Filters
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <FiDownload className="mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              title="Export raw report data as JSON"
            >
              <FiFileText className="mr-2" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div>
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-1 px-6" aria-label="Tabs">
              {['overview', 'members', 'payments', 'activities'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 border-b-2 font-medium text-sm capitalize transition-all duration-200 ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'overview' ? 'Dashboard' : tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && reportData && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Members</p>
                      <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{reportData.totalMembers.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Registered users</p>
                    </div>
                    <div className="p-4 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                      <FiUsers className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Active Members</p>
                      <p className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{reportData.activeMembers.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Currently active</p>
                    </div>
                    <div className="p-4 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                      <FiTrendingUp className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className="h-2 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">${reportData.totalRevenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Lifetime revenue</p>
                    </div>
                    <div className="p-4 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                      <FiDollarSign className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className="h-2 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Renewal Rate</p>
                      <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{reportData.renewalRate}%</p>
                      <p className="text-xs text-gray-500 mt-1">Member retention</p>
                    </div>
                    <div className="p-4 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                      <FiBarChart2 className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Membership Types Pie Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Membership Types Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={reportData.membershipTypes.map(type => ({
                        name: type.type || 'Unknown',
                        value: type.count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.membershipTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} members`, 'Count']} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Signups Line Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Signups Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.monthlySignups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value} members`, 'New Members']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="New Members"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {console.log('=== RENDER DEBUG ===')}
            {console.log('membershipAnalytics:', membershipAnalytics)}
            {console.log('membershipAnalytics.activeMembersList:', membershipAnalytics?.activeMembersList)}
            {console.log('membershipAnalytics.activeMembersList length:', membershipAnalytics?.activeMembersList?.length)}
            {console.log('=== END RENDER DEBUG ===')}
            {membershipAnalytics && (
              <div className="space-y-6">
                {/* Active Members List */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-lg font-semibold text-gray-900">Active Members List</h3>
                    <p className="text-sm text-gray-600 mt-1">Detailed list of all active members</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Membership Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expires
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {membershipAnalytics.activeMembersList && membershipAnalytics.activeMembersList.length > 0 ? (
                          membershipAnalytics.activeMembersList?.map((member: any) => (
                            <tr key={member.id || member.membership_number} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-sm font-medium text-blue-600">
                                        {member.name?.charAt(0)?.toUpperCase() || member.id?.toString().charAt(0) || 'U'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {member.name || `User ${member.id || 'Unknown'}`}
                                      {!member.name && (
                                        <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                          Missing User Record
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {member.email || 'No email'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-mono">
                                  {member.membership_number || 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                  {member.membership_type || 'personal'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {member.status || 'active'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {member.joined_date && member.joined_date !== '0000-00-00' ? new Date(member.joined_date).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="text-gray-500">
                                <div className="text-lg font-medium">No active members found</div>
                                <div className="text-sm mt-1">
                                  {membershipAnalytics.activeMembersList === undefined ? 
                                    'Loading member data...' : 
                                    'Active members will appear here once available'
                                  }
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Member Growth Chart */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Member Growth Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={membershipAnalytics.growth || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value} members`, 'New Members']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="new_members" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          name="New Members"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Status Distribution */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Membership Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={membershipAnalytics.statusDistribution || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {(membershipAnalytics.statusDistribution || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value} members`, name]} />
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Activity Levels Bar Chart */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">User Activity Levels</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={membershipAnalytics.activityLevels || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="activity_level" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value} users`, 'Count']} />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Users" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Retention Rate Line Chart */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Member Retention Rate</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={membershipAnalytics.retentionData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Retention Rate']} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="retention_rate" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          name="Retention Rate"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && paymentAnalytics && (
          <div className="space-y-6">
            {/* Payment Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <FiDollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${paymentAnalytics.metrics?.total_revenue?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-emerald-100 rounded-md p-3">
                    <FiTrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Success Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{paymentAnalytics.metrics?.success_rate || 0}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Trends */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Trends Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={paymentAnalytics.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total_amount" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={paymentAnalytics.paymentMethods || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(paymentAnalytics.paymentMethods || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} payments`, name]} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && activityAnalytics && (
          <div className="space-y-6">
            {/* Engagement Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Engagement Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{activityAnalytics.engagementMetrics?.weekly_active_users || 0}</div>
                  <div className="text-sm text-gray-500">Weekly Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{activityAnalytics.engagementMetrics?.monthly_active_users || 0}</div>
                  <div className="text-sm text-gray-500">Monthly Active</div>
                </div>
              </div>
            </div>

            {/* Login Activity Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Login Activity Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityAnalytics.loginActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value} logins`, 'Login Count']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="login_count" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Login Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
