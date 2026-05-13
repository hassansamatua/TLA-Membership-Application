// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/contexts/UnreadCountContext";
import { FiUser, FiCalendar, FiMail, FiPhone, FiMapPin, FiBriefcase, FiCheckCircle, FiAlertCircle, FiArrowRight, FiCreditCard, FiBell } from "react-icons/fi";
import { Surface, PageHeader, StatTile, StatusBadge } from "@/components/ui";

type MembershipStatusResponse = {
  success: boolean;
  message?: string;
  cycle?: {
    year: number;
    startDate: string;
    dueDate: string;
    expiryDate: string;
  };
  plan?: {
    type: 'personal' | 'organization';
    newUser: boolean;
  };
  fees?: {
    baseAmount: number;
    penaltyAmount: number;
    totalDue: number;
    currency: string;
  };
  membership?: {
    membershipNumber: string;
    membershipType: string;
    status: string;
    paymentStatus: string;
    joinedDate: string;
    expiryDate: string;
    amountPaid: number | string;
  } | null;
  paidCycles?: number[];
  canAccessIdCard?: boolean;
};

const calculateProfileCompletion = (user: any) => {
  if (!user) return 0;
  
  console.log('📊 Dashboard Page - Calculating completion for user:', user.name, 'ID:', user.id);
  
  let completedFields = 0;
  const totalFields = 10; // Total number of important fields
  
  // Check personal info (using flat structure)
  if (user.name) { completedFields++; console.log('✓ Name'); }
  if (user.date_of_birth) { completedFields++; console.log('✓ Date of Birth'); }
  if (user.phone) { completedFields++; console.log('✓ Phone'); }
  if (user.address) { completedFields++; console.log('✓ Address'); }
  if (user.employment) {
    try {
      const employment = JSON.parse(user.employment || '{}');
      if (employment.occupation) { completedFields++; console.log('✓ Occupation'); }
    } catch (e) {
      console.log('❌ Failed to parse employment');
    }
  }
  if (user.education) {
    try {
      const education = JSON.parse(user.education || '[]');
      if (education.length > 0) { completedFields++; console.log('✓ Education'); }
    } catch (e) {
      console.log('❌ Failed to parse education');
    }
  }
  if (user.membership_status) { completedFields++; console.log('✓ Membership Status'); }
  if (user.profile_picture) { completedFields++; console.log('✓ Profile Picture'); }
  if (user.id_proof_path) { completedFields++; console.log('✓ ID Proof'); }
  
  const percentage = Math.round((completedFields / totalFields) * 100);
  console.log(`📈 Dashboard Page - Completed: ${completedFields}/${totalFields} = ${percentage}%`);
  
  return percentage;
};

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { unreadCount } = useUnreadCount();
  const router = useRouter();
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatusResponse | null>(null);
  const [isMembershipLoading, setIsMembershipLoading] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);

  useEffect(() => {
    console.log('[Dashboard] Authentication check - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    if (!isLoading && !isAuthenticated) {
      console.log('[Dashboard] User not authenticated, redirecting to login');
      router.push('/auth/login');
    } else if (!isLoading && isAuthenticated) {
      console.log('[Dashboard] User authenticated, staying on dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      console.log('🔍 Dashboard - useEffect triggered with user:', user);
      console.log('🔍 Dashboard - user.membershipNumber:', user.membershipNumber);
      console.log('🔍 Dashboard - typeof user.membershipNumber:', typeof user.membershipNumber);
      console.log('🔍 Dashboard - user keys:', Object.keys(user));
      
      const completion = calculateProfileCompletion(user);
      setProfileCompletion(completion);
      
      // Fetch upcoming events
      const fetchUpcomingEvents = async () => {
        try {
          const response = await fetch('/api/events');
          const data = await response.json();
          if (data.events && Array.isArray(data.events)) {
            setUpcomingEvents(data.events);
          }
        } catch (error) {
          console.error('Error fetching events:', error);
        } finally {
          setIsEventsLoading(false);
        }
      };
      
      fetchUpcomingEvents();
      
      // Set membership status from user object (only available properties)
      setMembershipStatus({
        success: true,
        membership: {
          membershipNumber: user.membershipNumber || 'N/A',
          membershipType: 'personal', // Default value since not in User type
          status: user.isApproved ? 'active' : 'pending',
          paymentStatus: 'unknown', // Default value since not in User type
          joinedDate: 'unknown', // Default value since not in User type
          expiryDate: 'unknown', // Default value since not in User type
          amountPaid: 'unknown' // Default value since not in User type
        }
      });
    } else {
      console.log('🔍 Dashboard - useEffect triggered but user is null/undefined');
    }
  }, [user]);

  useEffect(() => {
    const loadMembershipStatus = async () => {
      try {
        if (!isAuthenticated) return;
        setIsMembershipLoading(true);
        const res = await fetch('/api/membership/status', { credentials: 'include' });
        const data = (await res.json().catch(() => ({}))) as MembershipStatusResponse;
        if (!res.ok) {
          setMembershipStatus({ success: false, message: data.message || 'Failed to load membership status' });
          return;
        }
        setMembershipStatus(data);
      } finally {
        setIsMembershipLoading(false);
      }
    };

    loadMembershipStatus();
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const quickActions = [
    { 
      title: 'View Profile', 
      description: 'View and edit your profile information',
      icon: <FiUser className="h-6 w-6 text-emerald-600" />,
      action: () => router.push('/dashboard/profile')
    },
    { 
      title: 'Upcoming Events', 
      description: 'Check your scheduled events and activities',
      icon: <FiCalendar className="h-6 w-6 text-emerald-600" />,
      action: () => router.push('/dashboard/events')
    },
    { 
      title: 'News', 
      description: 'View news and notifications from admin',
      icon: <FiMail className="h-6 w-6 text-blue-600" />,
      action: () => router.push('/dashboard/news'),
      badge: unreadCount > 0 ? unreadCount : null
    },
  ];

  const fmtDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PageHeader
          eyebrow="Member dashboard"
          title={`Welcome back, ${user?.name?.split(' ')[0] || 'Member'}`}
          description="Here's a snapshot of your membership, recent activity, and what's next."
          icon={<FiUser className="h-5 w-5" />}
          actions={
            <>
              {user?.isAdmin && (
                <a
                  href="/admin"
                  className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Admin panel
                </a>
              )}
              <button
                onClick={logout}
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
              >
                Sign out
              </button>
            </>
          }
        />

        {/* Membership Payment Status */}
        <Surface className="mb-6" padding="none">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6 dark:border-white/10">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Membership Payment</h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Your current membership payment status.
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
              <FiCreditCard className="h-5 w-5" />
            </span>
          </div>
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            {isMembershipLoading ? (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-emerald-500" />
                Loading membership status…
              </div>
            ) : membershipStatus?.success ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cycle{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {membershipStatus.cycle?.year}
                    </span>
                  </p>
                  {membershipStatus.canAccessIdCard ? (
                    <StatusBadge tone="emerald" icon={<FiCheckCircle className="h-3 w-3" />}>
                      Paid / Active
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="red" icon={<FiAlertCircle className="h-3 w-3" />}>
                      Payment Required
                    </StatusBadge>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatTile
                    label="Total due"
                    value={`${membershipStatus.fees?.currency || 'TZS'} ${Number(
                      membershipStatus.fees?.totalDue || 0
                    ).toLocaleString('en-US')}`}
                    hint={`Due date: ${membershipStatus.cycle?.dueDate || '—'}`}
                  />
                  <StatTile
                    label="Membership #"
                    value={user?.membershipNumber || 'N/A'}
                    hint={`Expiry: ${
                      fmtDate(membershipStatus.membership?.expiryDate) !== 'N/A'
                        ? fmtDate(membershipStatus.membership?.expiryDate)
                        : fmtDate(membershipStatus.cycle?.expiryDate)
                    }`}
                  />
                  <StatTile
                    label="Plan"
                    value={
                      membershipStatus.plan?.type === 'organization'
                        ? 'Organization'
                        : membershipStatus.plan?.newUser
                        ? 'Personal (New)'
                        : 'Personal (Renewal)'
                    }
                    hint={`Penalty: ${
                      membershipStatus.fees?.currency || 'TZS'
                    } ${Number(membershipStatus.fees?.penaltyAmount || 0).toLocaleString('en-US')}`}
                  />
                </div>

                {/* Cycles paid breakdown — shown when any cycle has been paid
                    so the multi-cycle prepayment is visible at a glance. */}
                {membershipStatus.paidCycles && membershipStatus.paidCycles.length > 0 && (
                  <div className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                    <div className="flex items-start gap-3">
                      <FiCheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0 dark:text-emerald-300" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                          Cycles paid ({membershipStatus.paidCycles.length})
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {membershipStatus.paidCycles.map((cy) => (
                            <span
                              key={cy}
                              className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                            >
                              {cy}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                          {membershipStatus.paidCycles.length > 1
                            ? `Prepaid through ${membershipStatus.paidCycles[membershipStatus.paidCycles.length - 1] + 1} — your card stays valid until January 31, ${membershipStatus.paidCycles[membershipStatus.paidCycles.length - 1] + 1}.`
                            : 'You can prepay up to 2 future cycles in one transaction — no discount, no penalties.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!membershipStatus.canAccessIdCard && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const type = membershipStatus.plan?.type || 'personal';
                        const newUser = membershipStatus.plan?.newUser ? 'true' : 'false';
                        router.push(`/dashboard/subscribe?type=${type}&newUser=${newUser}`);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                    >
                      <FiCreditCard className="h-4 w-4" />
                      Pay / Renew
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {membershipStatus?.message || 'Membership status unavailable.'}
              </div>
            )}
          </div>
        </Surface>

        {/* Profile Completion Card */}
        {profileCompletion < 100 && (
          <Surface className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5" padding="md">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">
                <FiAlertCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Profile {profileCompletion}% complete
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/complete-profile')}
                    className="text-sm font-semibold text-amber-800 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
                  >
                    Complete now &rarr;
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                  Finish your profile to unlock all features and a printable membership card.
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-500/20">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            </div>
          </Surface>
        )}

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-white/10 dark:bg-gray-900/60 dark:hover:border-emerald-500/30 dark:hover:bg-gray-900/80"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/30">
                {action.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {action.title}
                  </span>
                  {action.badge && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                      {action.badge}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
                  {action.description}
                </span>
              </span>
              <FiArrowRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:text-gray-500 dark:group-hover:text-emerald-300" />
            </button>
          ))}
        </div>

        {/* User Information */}
        <Surface className="mb-8" padding="none">
          <div className="border-b border-gray-200 px-5 py-4 sm:px-6 dark:border-white/10">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Personal Information</h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Your personal details and contact information.
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              {/* Profile Picture */}
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Profile Picture</dt>
                <dd className="mt-1 flex items-center">
                  {user?.profile?.personalInfo?.profilePicture ? (
                    <img
                      src={user.profile.personalInfo.profilePicture}
                      alt="Profile"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <FiUser className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <button
                    onClick={() => router.push('/dashboard/complete-profile')}
                    className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
                  >
                    <FiUser className="-ml-0.5 mr-2 h-4 w-4" />
                    Update Photo
                  </button>
                </dd>
              </div>

              {/* Full Name */}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Full name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user?.profile?.personalInfo?.fullName || 'Not provided'}
                </dd>
              </div>

              {/* Gender */}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user?.profile?.personalInfo?.gender ? (
                    user.profile.personalInfo.gender.charAt(0).toUpperCase() +
                    user.profile.personalInfo.gender.slice(1)
                  ) : (
                    'Not provided'
                  )}
                </dd>
              </div>

              {/* Date of Birth */}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user?.profile?.personalInfo?.dateOfBirth ? (
                    new Date(user.profile.personalInfo.dateOfBirth).toLocaleDateString()
                  ) : (
                    'Not provided'
                  )}
                </dd>
              </div>

              {/* Place of Birth */}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Place of Birth</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user?.profile?.personalInfo?.placeOfBirth || 'Not provided'}
                </dd>
              </div>

              {/* Email */}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{user?.email}</dd>
              </div>

              {/* Phone */}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user?.profile?.contactInfo?.phone || 'Not provided'}
                </dd>
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user?.profile?.contactInfo?.address ? (
                    <>
                      {user.profile.contactInfo.address}, {user.profile.contactInfo.city}, {user.profile.contactInfo.country} {user.profile.contactInfo.postalCode}
                    </>
                  ) : 'Not provided'}
                </dd>
              </div>

              {/* Account Status */}
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Account status</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {user?.isApproved ? (
                    <StatusBadge tone="emerald" icon={<FiCheckCircle className="h-3 w-3" />}>
                      Active
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="amber" icon={<FiAlertCircle className="h-3 w-3" />}>
                      Pending Approval
                    </StatusBadge>
                  )}
                </dd>
              </div>
            </div>
            <div className="mt-8 border-t border-gray-200 pt-5 dark:border-white/10">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/complete-profile')}
                  className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </Surface>

        {/* Upcoming Events */}
        <Surface padding="none">
          <div className="border-b border-gray-200 px-5 py-4 sm:px-6 dark:border-white/10">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Upcoming Events</h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Your upcoming events and activities.
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            {isEventsLoading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-gray-200 p-4 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/[0.02]"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{event.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 dark:text-gray-400">
                      {new Date(event.start_time).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">{event.location}</p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {event.current_attendees} / {event.capacity} attendees
                      </span>
                      <button
                        onClick={() => router.push('/dashboard/events')}
                        className="text-sm text-emerald-600 hover:text-emerald-800 font-medium dark:text-emerald-300 dark:hover:text-emerald-200"
                      >
                        View Details <span aria-hidden="true">&rarr;</span>
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => router.push('/dashboard/events')}
                    className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <FiCalendar className="-ml-1 mr-2 h-4 w-4" />
                    View All Events
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <FiCalendar className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  No upcoming events
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by checking out our upcoming events.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/dashboard/events')}
                    className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <FiCalendar className="-ml-1 mr-2 h-4 w-4" />
                    View All Events
                  </button>
                </div>
              </div>
            )}
          </div>
        </Surface>
      </main>
    </div>
  );
}