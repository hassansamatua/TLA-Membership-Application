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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* User Info */}
        <div className="flex flex-col items-center justify-center p-4 bg-green-600 text-white">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2">
            {user?.profile?.personalInfo?.profilePicture ? (
              <img src={user.profile.personalInfo.profilePicture} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <FiUser className="h-6 w-6 text-green-600" />
            )}
          </div>
          <h1 className="text-sm font-bold">{user?.name || 'User'}</h1>
          <p className="text-xs opacity-90">Member</p>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  isActive
                    ? 'bg-green-100 text-green-700 border-r-4 border-green-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setSidebarOpen(false)}
                target={item.external ? '_blank' : '_self'}
                rel={item.external ? 'noopener noreferrer' : ''}
              >
                <div className="flex items-center">
                  <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm flex-shrink-0">{item.label}</span>
                  {item.name === 'News' && unreadNewsCount > 0 && (
                    <span className="ml-2 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                      {unreadNewsCount > 99 ? '99+' : unreadNewsCount.toString()}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors duration-200"
          >
            <FiLogOut className="mr-3 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600"
            >
              <FiMenu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
            <div className="w-6"></div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}