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
  FiServer,
  FiDatabase,
  FiShield,
  FiMapPin,
  FiCreditCard as FiCard,
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
  const [extendedData, setExtendedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'payments' | 'events' | 'activities' | 'system'>(
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
      const [summaryRes, membershipRes, paymentRes, activityRes, extendedRes] = await Promise.all([
        fetch('/api/admin/reports/summary', { credentials: 'include' }),
        fetch(`/api/admin/reports/membership?period=${period}`, { credentials: 'include' }),
        fetch(`/api/admin/reports/payments?period=${period}`, { credentials: 'include' }),
        fetch(`/api/admin/reports/activities?period=${period}`, { credentials: 'include' }),
        fetch('/api/admin/reports/extended', { credentials: 'include' }),
      ]);

      const [summary, membership, payments, activity, extended] = await Promise.all([
        summaryRes.json(),
        membershipRes.json(),
        paymentRes.json(),
        activityRes.json(),
        extendedRes.json(),
      ]);

      if (summary.success) setReportData(summary.data);
      if (membership.success) setMembershipAnalytics(membership.data);
      if (payments.success) setPaymentAnalytics(payments.data);
      if (activity.success) setActivityAnalytics(activity.data);
      if (extended.success) setExtendedData(extended.data);
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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

      const element = document.getElementById('reports-content');
      if (!element) {
        toast.error('Could not find reports content to export');
        return;
      }

      toast.loading('Generating PDF...');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`TLA-Reports-${new Date().toISOString().split('T')[0]}.pdf`);

      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
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

      {/* Export buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => handleExport('json')}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <FiDownload className="h-4 w-4" />
          Export JSON
        </button>
        <button
          onClick={handlePdfExport}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiFileText className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      {/* Main content with ID for PDF export */}
      <div id="reports-content">
      {/* Hero KPI strip */}
      {reportData && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Total members"
            value={formatNumber(reportData.totalMembers)}
            hint="All-time registrations"
            icon={<FiUsers className="h-4 w-4" />}
            accent="from-emerald-500 to-emerald-600"
          />
          <KpiCard
            label="Paid members"
            value={formatNumber(extendedData?.paidVsUnpaid?.paid_members)}
            hint={`${extendedData?.paidVsUnpaid?.unpaid_members || 0} unpaid`}
            icon={<FiCheckCircle className="h-4 w-4" />}
            accent="from-emerald-600 to-teal-600"
          />
          <KpiCard
            label="Revenue · 30 days"
            value={formatTZSCompact(reportData.totalRevenue)}
            hint={formatTZS(reportData.totalRevenue)}
            icon={<FiCreditCard className="h-4 w-4" />}
            accent="from-teal-500 to-emerald-600"
          />
          <KpiCard
            label="Penalties collected"
            value={formatTZSCompact(extendedData?.penaltySummary?.total_penalty_collected)}
            hint={`${extendedData?.penaltySummary?.members_with_penalty || 0} members penalized`}
            icon={<FiAlertTriangle className="h-4 w-4" />}
            accent="from-amber-500 to-orange-500"
          />
          <KpiCard
            label="Cards eligible"
            value={formatNumber(extendedData?.cardStats?.cards_eligible)}
            hint={`${extendedData?.cardStats?.cards_generated || 0} numbers assigned`}
            icon={<FiCard className="h-4 w-4" />}
            accent="from-emerald-500 to-emerald-700"
          />
          <KpiCard
            label="Renewal rate"
            value={`${Number(reportData.renewalRate || 0).toFixed(1)}%`}
            hint="Lapsed members who came back"
            icon={<FiTrendingUp className="h-4 w-4" />}
            accent="from-emerald-600 to-emerald-700"
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
              { id: 'events', label: 'Events', icon: <FiCalendar className="h-4 w-4" /> },
              { id: 'activities', label: 'Engagement', icon: <FiActivity className="h-4 w-4" /> },
              { id: 'system', label: 'System', icon: <FiServer className="h-4 w-4" /> },
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
                <FeeTile label="New members (Regular & Librarian)" amount={60_000} hint="One-time joining fee" />
                <FeeTile
                  label="Continuing members (Regular & Librarian)"
                  amount={50_000}
                  hint="Annual cycle fee"
                />
                <FeeTile
                  label="Organisational members"
                  amount={200_000}
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

          {/* Paid vs Unpaid + Growth Rate row */}
          {extendedData && (
            <>
              <ChartCard
                title="Paid vs Unpaid"
                description="Current payment status of all memberships"
                icon={<FiCheckCircle className="h-4 w-4" />}
                empty={!extendedData.paidVsUnpaid?.total_members}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <RePieChart>
                    <Pie
                      data={[
                        { name: 'Paid', value: Number(extendedData.paidVsUnpaid?.paid_members) || 0 },
                        { name: 'Unpaid', value: Number(extendedData.paidVsUnpaid?.unpaid_members) || 0 },
                      ]}
                      cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                      stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={2}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <DarkAwareTooltip isDark={isDark} formatter={(v: number, n: string) => [`${v} members`, n]} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="lg:col-span-2">
                <ChartCard
                  title="Paid vs Unpaid trend"
                  description="Monthly paid & unpaid memberships over the last 12 months"
                  icon={<FiBarChart2 className="h-4 w-4" />}
                  empty={(extendedData.paidUnpaidTrend || []).length === 0}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={(extendedData.paidUnpaidTrend || []).map((r: any) => ({
                        month: r.month,
                        paid: Number(r.paid) || 0,
                        unpaid: Number(r.unpaid) || 0,
                      }))}
                      margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="month" stroke={axisStroke} tick={axisTick} />
                      <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                      <DarkAwareTooltip isDark={isDark} formatter={(v: number, n: string) => [`${v}`, n]} />
                      <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }} />
                      <Bar dataKey="paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Paid" />
                      <Bar dataKey="unpaid" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Unpaid" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            </>
          )}
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
                  formatter={(value: number) => [`${Number(value || 0).toFixed(1)}%`, 'Retention']}
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

          {/* Penalty breakdown */}
          {extendedData && (
            <>
              <ChartCard
                title="Penalty overview"
                description="Members with vs without late-payment penalties"
                icon={<FiShield className="h-4 w-4" />}
                empty={!extendedData.penaltySummary?.members_with_penalty && !extendedData.penaltySummary?.members_without_penalty}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <RePieChart>
                    <Pie
                      data={[
                        { name: 'With penalty', value: Number(extendedData.penaltySummary?.members_with_penalty) || 0 },
                        { name: 'No penalty', value: Number(extendedData.penaltySummary?.members_without_penalty) || 0 },
                      ]}
                      cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                      stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={2}
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <DarkAwareTooltip isDark={isDark} formatter={(v: number, n: string) => [`${v} members`, n]} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Penalties by cycle"
                description="Penalty revenue collected per membership cycle"
                icon={<FiAlertTriangle className="h-4 w-4" />}
                empty={(extendedData.penaltyByCycle || []).length === 0}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={(extendedData.penaltyByCycle || []).map((c: any) => ({
                      cycle: String(c.cycle_year),
                      penalized: Number(c.penalized) || 0,
                      noPenalty: Number(c.no_penalty) || 0,
                      totalPenalty: Number(c.total_penalty) || 0,
                    }))}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="cycle" stroke={axisStroke} tick={axisTick} />
                    <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                    <DarkAwareTooltip isDark={isDark} formatter={(v: number, n: string) => [n === 'Penalty (TZS)' ? formatTZS(v) : `${v}`, n]} />
                    <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }} />
                    <Bar dataKey="penalized" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Penalized" />
                    <Bar dataKey="noPenalty" fill="#10b981" radius={[4, 4, 0, 0]} name="No penalty" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </>
          )}

          {/* Cards generated */}
          {extendedData && (
            <div className="lg:col-span-2">
              <Surface padding="md">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                      <FiCard className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Membership cards</h3>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Cards generated & eligible for download</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Cards eligible</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(extendedData.cardStats?.cards_eligible)}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Active & paid members</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Numbers assigned</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(extendedData.cardStats?.cards_generated)}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Membership numbers issued</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total memberships</p>
                    <p className="mt-2 text-xl font-semibold text-gray-700 dark:text-gray-300">{formatNumber(extendedData.cardStats?.total_memberships)}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">All-time records</p>
                  </div>
                </div>
                {(extendedData.cardsByType || []).length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">By type</p>
                    <div className="space-y-2">
                      {(extendedData.cardsByType || []).map((t: any, i: number) => {
                        const pct = t.total > 0 ? Math.round((Number(t.eligible) / Number(t.total)) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="w-24 text-xs font-medium text-gray-700 dark:text-gray-300">{titleCase(t.type || 'Unknown')}</span>
                            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{t.eligible}/{t.total}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Surface>
            </div>
          )}
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

      {/* EVENTS */}
      {activeTab === 'events' && extendedData && (
        <div className="space-y-5">
          {/* Event KPI strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total events"
              value={formatNumber(extendedData.eventSummary?.length || 0)}
              hint="All-time events created"
              icon={<FiCalendar className="h-4 w-4" />}
              accent="from-emerald-500 to-emerald-600"
            />
            <KpiCard
              label="Total registrations"
              value={formatNumber(extendedData.eventSummary?.reduce((sum: number, e: any) => sum + (Number(e.total_registrations) || 0), 0) || 0)}
              hint="All event registrations"
              icon={<FiUsers className="h-4 w-4" />}
              accent="from-teal-500 to-emerald-600"
            />
            <KpiCard
              label="Event income"
              value={formatTZSCompact(extendedData.eventIncome?.reduce((sum: number, e: any) => sum + (Number(e.total_income) || 0), 0) || 0)}
              hint="Total from event payments"
              icon={<FiCreditCard className="h-4 w-4" />}
              accent="from-emerald-600 to-teal-600"
            />
            <KpiCard
              label="Avg attendance"
              value={`${Math.round(extendedData.eventSummary?.reduce((sum: number, e: any) => sum + (Number(e.attended) || 0), 0) / (extendedData.eventSummary?.length || 1) || 0)}%`}
              hint="Of registered attendees"
              icon={<FiUserCheck className="h-4 w-4" />}
              accent="from-emerald-500 to-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard
              title="Event participation"
              description="Registrations and attendance per event"
              icon={<FiUsers className="h-4 w-4" />}
              empty={(extendedData.eventSummary || []).length === 0}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={(extendedData.eventSummary || []).slice(0, 10).map((e: any) => ({
                    name: e.title?.substring(0, 20) || 'Unknown',
                    registered: Number(e.total_registrations) || 0,
                    attended: Number(e.attended) || 0,
                  }))}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" stroke={axisStroke} tick={axisTick} />
                  <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                  <DarkAwareTooltip isDark={isDark} formatter={(v: number, n: string) => [`${v}`, n]} />
                  <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }} />
                  <Bar dataKey="registered" fill="#10b981" radius={[4, 4, 0, 0]} name="Registered" />
                  <Bar dataKey="attended" fill="#0d9488" radius={[4, 4, 0, 0]} name="Attended" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Event income"
              description="Revenue generated by each event"
              icon={<FiCreditCard className="h-4 w-4" />}
              empty={(extendedData.eventIncome || []).length === 0}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={(extendedData.eventIncome || []).slice(0, 10).map((e: any) => ({
                    name: e.title?.substring(0, 20) || 'Unknown',
                    income: Number(e.total_income) || 0,
                    payments: Number(e.completed_payments) || 0,
                  }))}
                  margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="name" stroke={axisStroke} tick={axisTick} />
                  <YAxis stroke={axisStroke} tick={axisTick} />
                  <DarkAwareTooltip isDark={isDark} formatter={(v: number, n: string) => [n === 'Income (TZS)' ? formatTZS(v) : `${v}`, n]} />
                  <Bar dataKey="income" fill="#10b981" radius={[10, 10, 0, 0]} name="Income (TZS)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard
                title="Monthly event registrations"
                description="Event registration trends over the last 12 months"
                icon={<FiTrendingUp className="h-4 w-4" />}
                empty={(extendedData.eventTrend || []).length === 0}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={(extendedData.eventTrend || []).map((t: any) => ({
                      month: t.month,
                      registrations: Number(t.registrations) || 0,
                      paid: Number(t.paid) || 0,
                      events: Number(t.events_active) || 0,
                    }))}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="month" stroke={axisStroke} tick={axisTick} />
                    <YAxis stroke={axisStroke} tick={axisTick} allowDecimals={false} />
                    <DarkAwareTooltip isDark={isDark} formatter={(v: number, n: string) => [`${v}`, n]} />
                    <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }} />
                    <Area type="monotone" dataKey="registrations" stroke="#10b981" strokeWidth={2.5} fill="url(#eventGrad)" name="Registrations" />
                    <Area type="monotone" dataKey="paid" stroke="#0d9488" strokeWidth={2} fill="transparent" name="Paid" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM */}
      {activeTab === 'system' && extendedData && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total users"
              value={formatNumber(extendedData.systemPerf?.total_users || 0)}
              hint="Registered accounts"
              icon={<FiUsers className="h-4 w-4" />}
              accent="from-emerald-500 to-emerald-600"
            />
            <KpiCard
              label="Total memberships"
              value={formatNumber(extendedData.systemPerf?.total_memberships || 0)}
              hint="Membership records"
              icon={<FiDatabase className="h-4 w-4" />}
              accent="from-teal-500 to-emerald-600"
            />
            <KpiCard
              label="Total payments"
              value={formatNumber(extendedData.systemPerf?.totalPayments || 0)}
              hint="Payment transactions"
              icon={<FiCreditCard className="h-4 w-4" />}
              accent="from-emerald-600 to-teal-600"
            />
            <KpiCard
              label="Database size"
              value={`${Number(extendedData.systemPerf?.dbSizeMb || 0).toFixed(1)} MB`}
              hint={`${formatNumber(extendedData.systemPerf?.totalDbRows || 0)} total rows`}
              icon={<FiServer className="h-4 w-4" />}
              accent="from-emerald-500 to-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Surface padding="md">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                  <FiDatabase className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Database tables</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Size and row count per table</p>
                </div>
              </div>
              <div className="space-y-2">
                {(extendedData.systemPerf?.tableSizes || []).slice(0, 10).map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-white/5 dark:bg-white/[0.03]">
                    <span className="w-32 truncate text-xs font-medium text-gray-700 dark:text-gray-300">{t.table_name}</span>
                    <div className="flex-1 text-right">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(t.row_count)} rows</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({Number(t.size_kb || 0).toFixed(1)} KB)</span>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>

            <Surface padding="md">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                  <FiActivity className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">User engagement</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Activity metrics by time period</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active today</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(extendedData.userActivity?.active_today || 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active 7 days</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(extendedData.userActivity?.active_7d || 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active 30 days</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(extendedData.userActivity?.active_30d || 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active 90 days</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(extendedData.userActivity?.active_90d || 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-white/5 dark:bg-white/[0.03]">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Inactive (90+ days)</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatNumber(extendedData.userActivity?.inactive || 0)}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Monthly engagement rate</span>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{extendedData.userActivity?.monthly_engagement_pct || 0}%</span>
                  </div>
                </div>
              </div>
            </Surface>

            <div className="lg:col-span-2">
              <Surface padding="md">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                    <FiCheckCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Profile completion</h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">User profile data completeness</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Has profile</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{extendedData.profileCompletion?.profile_pct || 0}%</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatNumber(extendedData.profileCompletion?.has_profile || 0)}/{formatNumber(extendedData.profileCompletion?.total_users || 0)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Has photo</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{extendedData.profileCompletion?.photo_pct || 0}%</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatNumber(extendedData.profileCompletion?.has_photo || 0)} users</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Has phone</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{Math.round((Number(extendedData.profileCompletion?.has_phone || 0) / Number(extendedData.profileCompletion?.total_users || 1)) * 100)}%</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatNumber(extendedData.profileCompletion?.has_phone || 0)} users</p>
                  </div>
                </div>
              </Surface>
            </div>
          </div>
        </div>
      )}
    </div>
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
