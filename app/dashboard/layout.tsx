// app/(dashboard)/layout.tsx
"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Navbar } from "@/components/web/navbar";
import { Footer } from "@/components/web/footer";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { useEffect, useState } from "react";
import { canAccessDashboard } from "@/lib/profileCompletion";
import { UnreadCountProvider, useUnreadCount } from "@/contexts/UnreadCountContext";
import {
  FiHome,
  FiUser,
  FiCreditCard,
  FiBell,
  FiLogOut,
  FiInfo,
  FiCalendar,
  FiMail,
  FiPhone,
  FiMenu,
  FiX,
  FiAward,
  FiExternalLink,
} from "react-icons/fi";

const calculateProfileCompletion = (user: any) => {
  if (!user) return 0;

  let completedFields = 0;
  const totalFields = 25;

  console.log('Calculating completion for user: ' + user.name + ', ID: ' + user.id);

  // Personal Info fields (6)
  if (user.name) { completedFields++; console.log(' Name'); }
  if (user.date_of_birth) { completedFields++; console.log(' Date of Birth'); }
  if (user.gender) { completedFields++; console.log(' Gender'); }
  if (user.nationality) { completedFields++; console.log(' Nationality'); }
  if (user.place_of_birth) { completedFields++; console.log(' Place of Birth'); }
  if (user.id_number) { completedFields++; console.log(' ID Number'); }

  // Contact Info fields (6)
  if (user.phone) { completedFields++; console.log(' Phone'); }
  if (user.email) { completedFields++; console.log(' Email'); }
  if (user.address) { completedFields++; console.log(' Address'); }
  if (user.city) { completedFields++; console.log(' City'); }
  if (user.country) { completedFields++; console.log(' Country'); }
  if (user.postal_code) { completedFields++; console.log(' Postal Code'); }

  // Professional Info fields (5)
  try {
    const employment = JSON.parse(user.employment || '{}');
    if (employment.occupation) { completedFields++; console.log(' Occupation'); }
    if (employment.company) { completedFields++; console.log(' Company'); }
    if (employment.yearsOfExperience) { completedFields++; console.log(' Years of Experience'); }
    if (employment.skills && employment.skills.length > 0) { completedFields++; console.log(' Skills'); }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(' Failed to parse employment: ' + errorMessage);
  }

  // Education fields (3)
  try {
    const education = JSON.parse(user.education || '[]');
    if (education.length > 0 && education[0].highestDegree) { completedFields++; console.log(' Highest Degree'); }
    if (education.length > 0 && education[0].institution) { completedFields++; console.log(' Institution'); }
    if (education.length > 0 && education[0].yearOfGraduation) { completedFields++; console.log(' Year of Graduation'); }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(' Failed to parse education: ' + errorMessage);
  }

  // Documents fields (3)
  if (user.id_proof_path) { completedFields++; console.log(' ID Proof'); }
  if (user.degree_certificates_path) { completedFields++; console.log(' Degree Certificates'); }
  if (user.cv_path) { completedFields++; console.log(' CV'); }

  // Additional fields (2)
  if (user.profile_picture) { completedFields++; console.log(' Profile Picture'); }
  if (user.bio) { completedFields++; console.log(' Bio'); }

  const percentage = Math.round((completedFields / totalFields) * 100);
  console.log('Completed: ' + completedFields + '/' + totalFields + ' = ' + percentage + '%');
  
  return percentage;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const { unreadCount: unreadNewsCount, refreshUnreadCount } = useUnreadCount();

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load membership status and profile completion
  useEffect(() => {
    if (!mounted || authLoading || !user) return;

    const loadData = async () => {
      try {
        // Load membership status
        const res = await fetch('/api/membership/status', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMembershipStatus(data);
        }

        // Calculate profile completion
        const completion = calculateProfileCompletion(user);
        setProfileCompletion(completion);
        
        // Refresh unread count
        await refreshUnreadCount();
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();
  }, [mounted, authLoading, user, refreshUnreadCount]);

  // Refresh unread count when pathname changes (user returns from news page)
  useEffect(() => {
    if (!mounted || !user) return;
    
    // Refresh when user navigates back to dashboard
    if (pathname === '/dashboard') {
      refreshUnreadCount();
    }
  }, [mounted, user, pathname, refreshUnreadCount]);

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: FiHome },
    { name: 'Profile', href: '/dashboard/complete-profile', icon: FiUser },
    { name: 'Membership Card', href: '/dashboard/membership-card', icon: FiAward },
    { name: 'Payment', href: '/dashboard/subscribe', icon: FiCreditCard },
    { name: 'News', href: '/dashboard/news', icon: FiBell },
    { name: 'Events', href: '/dashboard/events', icon: FiCalendar },
    { name: 'About', href: '/about', icon: FiInfo },
    { name: 'Contact', href: '/contact', icon: FiMail },
    { name: 'View Site', href: '/', icon: FiExternalLink, external: true },
  ].map((item) => ({ ...item, label: item.name }));

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex dark:bg-gray-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 dark:border-white/10 dark:bg-gray-900 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* User identity */}
        <div className="border-b border-gray-200 px-5 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/30">
              {user?.profile?.personalInfo?.profilePicture ? (
                <img
                  src={user.profile.personalInfo.profilePicture}
                  alt="Profile"
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <FiUser className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {user?.name || 'Member'}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {user?.email || 'Member'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                target={item.external ? '_blank' : '_self'}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={`group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.name === 'News' && unreadNewsCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {unreadNewsCount > 99 ? '99+' : unreadNewsCount}
                  </span>
                )}
                {item.external && (
                  <FiExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-3 dark:border-white/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <FiLogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Top bar (mobile + tablet) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-md lg:hidden dark:border-white/10 dark:bg-gray-900/80">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            aria-label="Open navigation"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dashboard</span>
          <span className="w-9" aria-hidden="true" />
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}