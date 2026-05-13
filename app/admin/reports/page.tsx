'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiBarChart2,
  FiDownload,
  FiFileText,
  FiUsers,
  FiTrendingUp,
  FiCreditCard,
  FiActivity,
  FiPieChart,
  FiCalendar,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiUserCheck,
} from 'react-icons/fi';
import {
  AreaChart,
  Area,
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
  Line,
} from 'recharts';
import { Surface, PageHeader, StatusBadge, EmptyState } from '@/components/ui';

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

interface ReportData {
  totalMembers: number;
  activeMembers: number;
  totalRevenue: number;
  renewalRate: number;
  membershipTypes: Array<{ type: string; count: number }>;
  monthlySignups: Array<{ month: string; count: number }>;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

/* -------------------------------------------------------------------------- */
/*                          Formatting / helpers                              */
/* -------------------------------------------------------------------------- */

const formatTZS = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  if (!isFinite(n)) return 'TZS 0';
  return `TZS ${Math.round(n).toLocaleString('en-TZ')}`;
};

const formatTZSCompact = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  if (!isFinite(n)) return 'TZS 0';
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(1)}k`;
  return `TZS ${Math.round(n).toLocaleString('en-TZ')}`;
};

const formatNumber = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return isFinite(n) ? n.toLocaleString('en-TZ') : '0';
};

const titleCase = (s: string) =>
  s
    ? s.replace(/[_-]/g, ' ').replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase())
    : '—';

const dayOfWeekLabel = (n: number) =>
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][((n - 1) % 7 + 7) % 7];

/* -------------------------------------------------------------------------- */
/*                              Chart palette                                 */
/* -------------------------------------------------------------------------- */

/** Emerald-led palette used across every chart so the TLA brand carries through. */
const EMERALD_SERIES = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46'];
/** Status-aware palette for distributions (active = emerald, expired = red, etc.). */
const STATUS_PALETTE: Record<string, string> = {
  active: '#10b981',
  expired: '#ef4444',
  cancelled: '#94a3b8',
  pending: '#f59e0b',
  suspended: '#f97316',
};
const FALLBACK_PALETTE = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

const pickStatusColor = (key: string, i: number) =>
  STATUS_PALETTE[String(key || '').toLowerCase()] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];

/* -------------------------------------------------------------------------- */
/*                  Shared chart card + dark-aware tooltip                    */
/* -------------------------------------------------------------------------- */

function ChartCard({
  title,
  description,
  icon,
  action,
  empty,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Surface padding="md" className="flex h-full flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1">
        {empty ? (
          <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/40 text-xs text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-400">
            No data available for this period.
          </div>
        ) : (
          children
        )}
      </div>
    </Surface>
  );
}

function DarkAwareTooltip({
  isDark,
  formatter,
  valueLabel,
}: {
  isDark: boolean;
  formatter?: (value: number, name: string) => [string, string];
  valueLabel?: string;
}) {
  return (
    <Tooltip
      cursor={{ fill: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.08)' }}
      contentStyle={{
        backgroundColor: isDark ? 'rgba(17,24,39,0.96)' : 'rgba(255,255,255,0.98)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(229,231,235,1)'}`,
        borderRadius: 12,
        padding: '8px 12px',
        fontSize: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        color: isDark ? '#e5e7eb' : '#111827',
      }}
      labelStyle={{ color: isDark ? '#9ca3af' : '#6b7280', marginBottom: 4, fontSize: 11 }}
      itemStyle={{ color: isDark ? '#e5e7eb' : '#111827' }}
      formatter={
        formatter ||
        ((value: number, name: string) => [formatNumber(value), valueLabel || name])
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                                Main page                                   */
/* -------------------------------------------------------------------------- */

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isAdmin = user?.isAdmin || false;
  const isDark = resolvedTheme === 'dark';

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [membershipAnalytics, setMembershipAnalytics] = useState<any>(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState<any>(null);
  const [activityAnalytics, setActivityAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'payments' | 'activities'>(
    'overview',
  );
  const [period, setPeriod] = useState<Period>('monthly');

  useEffect(() => {
    if (!user || !isAdmin) {
      router.push('/login');
      return;
    }
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, period]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [summaryRes, membershipRes, paymentRes, activityRes] = await Promise.all([
        fetch('/api/admin/reports/summary'),
        fetch(`/api/admin/reports/membership?period=${period}`),
        fetch(`/api/admin/reports/payments?period=${period}`),
        fetch(`/api/admin/reports/activities?period=${period}`),
      ]);

      const [summary, membership, payments, activity] = await Promise.all([
        summaryRes.json(),
        membershipRes.json(),
        paymentRes.json(),
        activityRes.json(),
      ]);

      if (summary.success) setReportData(summary.data);
      if (membership.success) setMembershipAnalytics(membership.data);
      if (payments.success) setPaymentAnalytics(payments.data);
      if (activity.success) setActivityAnalytics(activity.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- Export logic ----------------------------- */

  const handleExport = (format: 'csv' | 'json') => {
    const today = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      const data = {
        generatedAt: new Date().toISOString(),
        organisation: 'Tanzania Library Association',
        period,
        summary: reportData,
        membership: membershipAnalytics,
        payments: paymentAnalytics,
        activities: activityAnalytics,
      };
      downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        `tla-report-${today}.json`,
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

    row('Tanzania Library Association — Membership Report');
    row('Generated at', new Date().toISOString());
    row('Period', period);
    row();

    if (reportData) {
      row('SUMMARY');
      row('Metric', 'Value');
      row('Total Members', reportData.totalMembers);
      row('Active Members', reportData.activeMembers);
      row('Revenue (last 30 days, TZS)', reportData.totalRevenue);
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

    if (paymentAnalytics?.metrics) {
      row('PAYMENTS');
      for (const [k, v] of Object.entries(paymentAnalytics.metrics)) {
        if (typeof v === 'object' && v !== null) continue;
        row(titleCase(k), v as any);
      }
      row();
    }

    if (membershipAnalytics?.activeMembersList?.length) {
      const list: any[] = membershipAnalytics.activeMembersList;
      const keys = Object.keys(list[0]);
      row('ACTIVE MEMBERS');
      row(...keys);
      for (const m of list) row(...keys.map((k) => m[k]));
      row();
    }

    downloadBlob(
      new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
      `tla-report-${period}-${today}.csv`,
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

  /* --------------------------- Derived chart data ------------------------- */

  const monthlySignupsData = useMemo(
    () =>
      (reportData?.monthlySignups || []).map((m) => ({
        month: m.month,
        members: Number(m.count) || 0,
      })),
    [reportData],
  );

  const typeDistributionData = useMemo(
    () =>
      (reportData?.membershipTypes || []).map((t) => ({
        name: titleCase(t.type || 'unknown'),
        value: Number(t.count) || 0,
      })),
    [reportData],
  );

  const statusDistributionData = useMemo(
    () =>
      (membershipAnalytics?.statusDistribution || []).map((s: any) => ({
        name: titleCase(s.status || 'unknown'),
        rawStatus: s.status,
        value: Number(s.count) || 0,
        percentage: Number(s.percentage) || 0,
      })),
    [membershipAnalytics],
  );

  const memberGrowthData = useMemo(
    () =>
      (membershipAnalytics?.growth || []).map((g: any) => ({
        period: g.period,
        new: Number(g.new_members) || 0,
      })),
    [membershipAnalytics],
  );

  const activityLevelsData = useMemo(
    () =>
      (membershipAnalytics?.activityLevels || []).map((a: any) => ({
        level: a.activity_level,
        count: Number(a.count) || 0,
      })),
    [membershipAnalytics],
  );

  const retentionData = useMemo(
    () =>
      (membershipAnalytics?.retentionData || []).map((r: any) => ({
        month: r.month,
        rate: Number(r.retention_rate) || 0,
        newMembers: Number(r.new_members) || 0,
      })),
    [membershipAnalytics],
  );

  const paymentTrendsData = useMemo(
    () =>
      (paymentAnalytics?.trends || []).map((t: any) => ({
        period: t.period,
        revenue: Number(t.total_amount) || 0,
        payments: Number(t.payment_count) || 0,
        failed: Number(t.failed_count) || 0,
      })),
    [paymentAnalytics],
  );

  const paymentMethodsData = useMemo(
    () =>
      (paymentAnalytics?.paymentMethods || []).map((m: any) => ({
        name: titleCase(m.method || 'Unknown'),
        value: Number(m.count) || 0,
        revenue: Number(m.total_amount) || 0,
        percentage: Number(m.percentage) || 0,
      })),
    [paymentAnalytics],
  );

  const revenueByTypeData = useMemo(
    () =>
      (paymentAnalytics?.revenueByType || []).map((r: any) => ({
        type: titleCase(r.membership_type || 'Unknown'),
        revenue: Number(r.total_revenue) || 0,
        payments: Number(r.payment_count) || 0,
      })),
    [paymentAnalytics],
  );

  const loginActivityData = useMemo(
    () =>
      (activityAnalytics?.loginActivity || []).map((l: any) => ({
        period: l.period,
        logins: Number(l.login_count) || 0,
        unique: Number(l.unique_users) || 0,
      })),
    [activityAnalytics],
  );

  const dailyActiveData = useMemo(
    () =>
      (activityAnalytics?.dailyActiveUsers || []).map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-TZ', { month: 'short', day: 'numeric' }),
        users: Number(d.daily_active_users) || 0,
      })),
    [activityAnalytics],
  );

  const dayOfWeekData = useMemo(() => {
    const buckets: Record<number, { day: string; payments: number; amount: number }> = {};
    for (const p of paymentAnalytics?.paymentPatterns || activityAnalytics?.paymentPatterns || []) {
      const dow = Number(p.day_of_week) || 1;
      if (!buckets[dow]) buckets[dow] = { day: dayOfWeekLabel(dow), payments: 0, amount: 0 };
      buckets[dow].payments += Number(p.payment_count) || 0;
      buckets[dow].amount += Number(p.total_amount) || 0;
    }
    return [1, 2, 3, 4, 5, 6, 7].map(
      (d) => buckets[d] || { day: dayOfWeekLabel(d), payments: 0, amount: 0 },
    );
  }, [paymentAnalytics, activityAnalytics]);

  /* ------------------------------ Loading state --------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading TLA analytics…</p>
      </div>
    );
  }

  /* -------------------------------- Render -------------------------------- */

  const periodLabel: Record<Period, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };

  const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const axisStroke = isDark ? '#6b7280' : '#94a3b8';
  const axisTick = { fill: isDark ? '#9ca3af' : '#64748b', fontSize: 11 };

  return (
    <div>
      <button
        onClick={() => router.push('/admin')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 dark:text-gray-400 dark:hover:text-emerald-300"
      >
        <FiArrowLeft className="h-3.5 w-3.5" />
        Back to admin
      </button>

      <PageHeader
        eyebrow="Tanzania Library Association"
        title="Membership analytics"
        description="Track membership growth, cycle revenue, payment performance, and engagement across TLA — all in real time."
        icon={<FiBarChart2 className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 text-xs dark:border-white/10 dark:bg-gray-900">
              {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-2.5 py-1.5 font-medium capitalize transition-colors ${
                    period === p
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <FiDownload className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5"
              title="Export raw analytics data as JSON"
            >
              <FiFileText className="h-4 w-4" />
              JSON
            </button>
          </div>
        }
      />

      {/* Hero KPI strip */}
      {reportData && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total members"
            value={formatNumber(reportData.totalMembers)}
            hint="All-time registrations"
            icon={<FiUsers className="h-4 w-4" />}
            accent="from-emerald-500 to-emerald-600"
          />
          <KpiCard
            label="Active members"
            value={formatNumber(reportData.activeMembers)}
            hint={`${
              reportData.totalMembers
                ? Math.round((reportData.activeMembers / reportData.totalMembers) * 100)
                : 0
            }% of all registrations`}
            icon={<FiUserCheck className="h-4 w-4" />}
            accent="from-teal-500 to-emerald-600"
          />
          <KpiCard
            label="Revenue · last 30 days"
            value={formatTZSCompact(reportData.totalRevenue)}
            hint={formatTZS(reportData.totalRevenue)}
            icon={<FiCreditCard className="h-4 w-4" />}
            accent="from-emerald-600 to-emerald-700"
          />
          <KpiCard
            label="Renewal rate"
            value={`${reportData.renewalRate.toFixed(1)}%`}
            hint="Lapsed members who came back"
            icon={<FiTrendingUp className="h-4 w-4" />}
            accent="from-amber-500 to-orange-500"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5 overflow-x-auto">
        <div className="inline-flex items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-gray-900">
          {(
            [
              { id: 'overview', label: 'Overview', icon: <FiPieChart className="h-4 w-4" /> },
              { id: 'members', label: 'Members', icon: <FiUsers className="h-4 w-4" /> },
              { id: 'payments', label: 'Payments', icon: <FiCreditCard className="h-4 w-4" /> },
              { id: 'activities', label: 'Engagement', icon: <FiActivity className="h-4 w-4" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && reportData && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard
              title="Membership growth"
              description={`New TLA members per month · ${periodLabel[period]} view`}
              icon={<FiTrendingUp className="h-4 w-4" />}
              empty={monthlySignupsData.length === 0}
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlySignupsData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="signupsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="month" stroke={axisStroke} tick={axisTick} />
                  <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                  <DarkAwareTooltip
                    isDark={isDark}
                    formatter={(value: number) => [`${value} members`, 'New sign-ups']}
                  />
                  <Area
                    type="monotone"
                    dataKey="members"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#signupsGrad)"
                    name="New members"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard
            title="Membership tiers"
            description="Distribution by membership type"
            icon={<FiPieChart className="h-4 w-4" />}
            empty={typeDistributionData.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={typeDistributionData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke={isDark ? '#0f172a' : '#ffffff'}
                  strokeWidth={2}
                >
                  {typeDistributionData.map((_, i) => (
                    <Cell key={i} fill={EMERALD_SERIES[i % EMERALD_SERIES.length]} />
                  ))}
                </Pie>
                <DarkAwareTooltip
                  isDark={isDark}
                  formatter={(value: number, name: string) => [`${value} members`, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="lg:col-span-3">
            <Surface padding="md">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Cycle-fee snapshot
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Fee structure used by every TLA membership cycle (Feb 1 → Jan 31).
                  </p>
                </div>
                <StatusBadge tone="emerald">Current rates</StatusBadge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FeeTile label="New personal members" amount={40_000} hint="One-time joining fee" />
                <FeeTile
                  label="Continuing personal members"
                  amount={30_000}
                  hint="Annual cycle fee"
                />
                <FeeTile
                  label="Organisational members"
                  amount={150_000}
                  hint="Annual institutional fee"
                />
              </div>
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <FiAlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
                Late penalty: <strong>TZS 1,000 / month</strong> applied to members who pay after
                April 1 of their cycle year.
              </p>
            </Surface>
          </div>
        </div>
      )}

      {/* MEMBERS */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard
            title="Status distribution"
            description="Active vs. expired vs. cancelled memberships"
            icon={<FiPieChart className="h-4 w-4" />}
            empty={statusDistributionData.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={statusDistributionData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke={isDark ? '#0f172a' : '#ffffff'}
                  strokeWidth={2}
                >
                  {statusDistributionData.map((s: any, i: number) => (
                    <Cell key={i} fill={pickStatusColor(s.rawStatus, i)} />
                  ))}
                </Pie>
                <DarkAwareTooltip
                  isDark={isDark}
                  formatter={(value: number, name: string) => [`${value} members`, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Activity levels"
            description="Based on last profile update across the member base"
            icon={<FiActivity className="h-4 w-4" />}
            empty={activityLevelsData.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={activityLevelsData}
                layout="vertical"
                margin={{ top: 10, right: 16, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                <YAxis
                  dataKey="level"
                  type="category"
                  stroke={axisStroke}
                  tick={axisTick}
                  width={110}
                />
                <DarkAwareTooltip
                  isDark={isDark}
                  formatter={(value: number) => [`${value} members`, 'Count']}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} name="Members">
                  {activityLevelsData.map((_: any, i: number) => (
                    <Cell key={i} fill={EMERALD_SERIES[i % EMERALD_SERIES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Member growth"
            description={`New registrations · ${periodLabel[period]}`}
            icon={<FiTrendingUp className="h-4 w-4" />}
            empty={memberGrowthData.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={memberGrowthData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="period" stroke={axisStroke} tick={axisTick} />
                <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                <DarkAwareTooltip
                  isDark={isDark}
                  formatter={(value: number) => [`${value} members`, 'New members']}
                />
                <Area
                  type="monotone"
                  dataKey="new"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#growthGrad)"
                  name="New members"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Retention rate"
            description="Share of members who renewed one year later"
            icon={<FiUserCheck className="h-4 w-4" />}
            empty={retentionData.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={retentionData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" stroke={axisStroke} tick={axisTick} />
                <YAxis
                  stroke={axisStroke}
                  tick={axisTick}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <DarkAwareTooltip
                  isDark={isDark}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Retention']}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#fff' }}
                  activeDot={{ r: 6 }}
                  name="Retention rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Active members table */}
          <div className="lg:col-span-2">
            <Surface padding="none" className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Active members
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Most recent {membershipAnalytics?.activeMembersList?.length || 0} active
                    memberships
                  </p>
                </div>
                <StatusBadge tone="emerald" icon={<FiCheckCircle className="h-3 w-3" />}>
                  Live snapshot
                </StatusBadge>
              </div>
              {membershipAnalytics?.activeMembersList?.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                    <thead className="bg-gray-50/60 dark:bg-white/[0.02]">
                      <tr>
                        {['Member', 'Membership #', 'Type', 'Status', 'Expires', 'Joined'].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {membershipAnalytics.activeMembersList.map((m: any) => (
                        <tr
                          key={m.id || m.membership_number}
                          className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
                                {(m.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {m.name || `User ${m.id || '—'}`}
                                </p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {m.email || 'No email'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                            {m.membership_number || '—'}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge tone="emerald">
                              {titleCase(m.membership_type || 'personal')}
                            </StatusBadge>
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge tone={m.status === 'active' ? 'emerald' : 'gray'}>
                              {titleCase(m.status || 'active')}
                            </StatusBadge>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {m.expiry_date
                              ? new Date(m.expiry_date).toLocaleDateString('en-TZ')
                              : '—'}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {m.joined_date && m.joined_date !== '0000-00-00'
                              ? new Date(m.joined_date).toLocaleDateString('en-TZ')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState
                    icon={<FiUsers className="h-6 w-6" />}
                    title="No active members yet"
                    description="Once memberships are activated, they'll appear here."
                  />
                </div>
              )}
            </Surface>
          </div>
        </div>
      )}

      {/* PAYMENTS */}
      {activeTab === 'payments' && paymentAnalytics && (
        <div className="space-y-5">
          {/* Payment KPI strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Revenue collected"
              value={formatTZSCompact(paymentAnalytics.metrics?.total_revenue)}
              hint={formatTZS(paymentAnalytics.metrics?.total_revenue)}
              icon={<FiCreditCard className="h-4 w-4" />}
              accent="from-emerald-500 to-emerald-600"
            />
            <KpiCard
              label="Successful payments"
              value={formatNumber(paymentAnalytics.metrics?.successful_payments)}
              hint={`${paymentAnalytics.metrics?.total_payments || 0} attempts total`}
              icon={<FiCheckCircle className="h-4 w-4" />}
              accent="from-teal-500 to-emerald-600"
            />
            <KpiCard
              label="Success rate"
              value={`${Number(paymentAnalytics.metrics?.success_rate || 0).toFixed(1)}%`}
              hint={`${paymentAnalytics.metrics?.failed_payments || 0} failed`}
              icon={<FiTrendingUp className="h-4 w-4" />}
              accent="from-amber-500 to-orange-500"
            />
            <KpiCard
              label="Average payment"
              value={formatTZSCompact(paymentAnalytics.metrics?.avg_payment)}
              hint={`${paymentAnalytics.metrics?.paying_customers || 0} paying members`}
              icon={<FiUserCheck className="h-4 w-4" />}
              accent="from-emerald-600 to-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard
                title="Revenue trend"
                description={`Cycle revenue over the last 12 ${periodLabel[period].toLowerCase()} periods`}
                icon={<FiTrendingUp className="h-4 w-4" />}
                empty={paymentTrendsData.length === 0}
              >
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart
                    data={paymentTrendsData}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="period" stroke={axisStroke} tick={axisTick} />
                    <YAxis
                      stroke={axisStroke}
                      tick={axisTick}
                      tickFormatter={(v) => formatTZSCompact(v).replace('TZS ', '')}
                    />
                    <DarkAwareTooltip
                      isDark={isDark}
                      formatter={(value: number, name: string) => {
                        if (name === 'Revenue') return [formatTZS(value), 'Revenue'];
                        return [`${value}`, name];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard
              title="Payment networks"
              description="Share of successful transactions per gateway"
              icon={<FiPieChart className="h-4 w-4" />}
              empty={paymentMethodsData.length === 0}
            >
              <ResponsiveContainer width="100%" height={320}>
                <RePieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke={isDark ? '#0f172a' : '#ffffff'}
                    strokeWidth={2}
                  >
                    {paymentMethodsData.map((_: any, i: number) => (
                      <Cell key={i} fill={EMERALD_SERIES[i % EMERALD_SERIES.length]} />
                    ))}
                  </Pie>
                  <DarkAwareTooltip
                    isDark={isDark}
                    formatter={(value: number, name: string) => [`${value} payments`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard
              title="Revenue by membership type"
              description="Where TLA income comes from"
              icon={<FiBarChart2 className="h-4 w-4" />}
              empty={revenueByTypeData.length === 0}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={revenueByTypeData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="type" stroke={axisStroke} tick={axisTick} />
                  <YAxis
                    stroke={axisStroke}
                    tick={axisTick}
                    tickFormatter={(v) => formatTZSCompact(v).replace('TZS ', '')}
                  />
                  <DarkAwareTooltip
                    isDark={isDark}
                    formatter={(value: number) => [formatTZS(value), 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[10, 10, 0, 0]} name="Revenue">
                    {revenueByTypeData.map((_: any, i: number) => (
                      <Cell key={i} fill={EMERALD_SERIES[i % EMERALD_SERIES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Payments by weekday"
              description="When members pay most often (last 90 days)"
              icon={<FiCalendar className="h-4 w-4" />}
              empty={dayOfWeekData.every((d) => d.payments === 0)}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dayOfWeekData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="day" stroke={axisStroke} tick={axisTick} />
                  <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                  <DarkAwareTooltip
                    isDark={isDark}
                    formatter={(value: number) => [`${value} payments`, 'Payments']}
                  />
                  <Bar dataKey="payments" radius={[10, 10, 0, 0]} fill="#10b981" name="Payments" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ACTIVITIES */}
      {activeTab === 'activities' && activityAnalytics && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Weekly active"
              value={formatNumber(activityAnalytics.engagementMetrics?.weekly_active_users)}
              hint={`${
                Number(activityAnalytics.engagementMetrics?.weekly_engagement_rate || 0).toFixed(1)
              }% engagement rate`}
              icon={<FiClock className="h-4 w-4" />}
              accent="from-emerald-500 to-emerald-600"
            />
            <KpiCard
              label="Monthly active"
              value={formatNumber(activityAnalytics.engagementMetrics?.monthly_active_users)}
              hint={`${
                Number(activityAnalytics.engagementMetrics?.monthly_engagement_rate || 0).toFixed(1)
              }% engagement rate`}
              icon={<FiActivity className="h-4 w-4" />}
              accent="from-teal-500 to-emerald-600"
            />
            <KpiCard
              label="Quarterly active"
              value={formatNumber(activityAnalytics.engagementMetrics?.quarterly_active_users)}
              hint={`${formatNumber(
                activityAnalytics.engagementMetrics?.total_users,
              )} total registered`}
              icon={<FiUsers className="h-4 w-4" />}
              accent="from-emerald-600 to-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard
              title="Login activity"
              description={`User sessions over the last 12 ${periodLabel[period].toLowerCase()} periods`}
              icon={<FiActivity className="h-4 w-4" />}
              empty={loginActivityData.length === 0}
            >
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={loginActivityData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="period" stroke={axisStroke} tick={axisTick} />
                  <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                  <DarkAwareTooltip
                    isDark={isDark}
                    formatter={(value: number, name: string) => [`${value}`, name]}
                  />
                  <Legend
                    verticalAlign="top"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="logins"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#loginGrad)"
                    name="Total sessions"
                  />
                  <Line
                    type="monotone"
                    dataKey="unique"
                    stroke="#0891b2"
                    strokeWidth={2}
                    dot={false}
                    name="Unique users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Daily active users"
              description="Last 30 days of TLA platform activity"
              icon={<FiTrendingUp className="h-4 w-4" />}
              empty={dailyActiveData.length === 0}
            >
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={dailyActiveData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" stroke={axisStroke} tick={axisTick} />
                  <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                  <DarkAwareTooltip
                    isDark={isDark}
                    formatter={(value: number) => [`${value} users`, 'Active users']}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    name="Daily active"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard
            title="Feature usage"
            description="How often each TLA service was used during this window"
            icon={<FiBarChart2 className="h-4 w-4" />}
            empty={!(activityAnalytics.featureUsage?.length > 0)}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={(activityAnalytics.featureUsage || []).map((f: any) => ({
                  feature: titleCase(f.feature || 'Unknown'),
                  count: Number(f.usage_count) || 0,
                }))}
                margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="feature" stroke={axisStroke} tick={axisTick} />
                <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                <DarkAwareTooltip
                  isDark={isDark}
                  formatter={(value: number) => [`${value} times`, 'Used']}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} name="Usage">
                  {(activityAnalytics.featureUsage || []).map((_: any, i: number) => (
                    <Cell key={i} fill={EMERALD_SERIES[i % EMERALD_SERIES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Small presentational                            */
/* -------------------------------------------------------------------------- */

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-white/10 dark:bg-gray-900/60 dark:hover:border-emerald-500/30">
      <div className={`h-1.5 bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </p>
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              {icon}
            </span>
          )}
        </div>
        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-50">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

function FeeTile({
  label,
  amount,
  hint,
}: {
  label: string;
  amount: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">
        {formatTZS(amount)}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  );
}
