"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PaymentStatusSidebar from './PaymentStatusSidebar';

interface MembershipStatus {
  success: boolean;
  cycle?: {
    year: number;
    startDate: string;
    dueDate: string;
    expiryDate: string;
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
  canAccessIdCard?: boolean;
}

export default function DashboardSidebar() {
  const { user } = useAuth();
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load membership status
        const res = await fetch('/api/membership/status', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMembershipStatus(data);
        }

        // Calculate profile completion
        if (user) {
          const completion = calculateProfileCompletion(user);
          setProfileCompletion(completion);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadData();
  }, [user]);

  const calculateProfileCompletion = (user: any) => {
    if (!user) return 0;

    let completedFields = 0;
    const totalFields = 25;

    // Personal Info fields (6)
    if (user.name) completedFields++;
    if (user.date_of_birth) completedFields++;
    if (user.gender) completedFields++;
    if (user.nationality) completedFields++;
    if (user.place_of_birth) completedFields++;
    if (user.id_number) completedFields++;

    // Contact Info fields (6)
    if (user.phone) completedFields++;
    if (user.email) completedFields++;
    if (user.address) completedFields++;
    if (user.city) completedFields++;
    if (user.country) completedFields++;
    if (user.postal_code) completedFields++;

    // Professional Info fields (5)
    try {
      const employment = JSON.parse(user.employment || '{}');
      if (employment.occupation) completedFields++;
      if (employment.company) completedFields++;
      if (employment.yearsOfExperience) completedFields++;
      if (employment.skills && employment.skills.length > 0) completedFields++;
    } catch (e) {
      // Skip if parsing fails
    }

    // Education fields (3)
    try {
      const education = JSON.parse(user.education || '[]');
      if (education.length > 0 && education[0].highestDegree) completedFields++;
      if (education.length > 0 && education[0].institution) completedFields++;
      if (education.length > 0 && education[0].yearOfGraduation) completedFields++;
    } catch (e) {
      // Skip if parsing fails
    }

    // Documents fields (3)
    if (user.id_proof_path) completedFields++;
    if (user.degree_certificates_path) completedFields++;
    if (user.cv_path) completedFields++;

    // Additional fields (2)
    if (user.profile_picture) completedFields++;
    if (user.bio) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  };

  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div className="text-xs font-medium text-gray-500 mb-3">Dashboard</div>
      
      {/* Membership Status */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-medium text-gray-600">Membership Status</div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Cycle:</span>
            <span className="font-medium">{membershipStatus?.cycle?.year || 'N/A'}</span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Status:</span>
            <span className={`font-medium ${membershipStatus?.canAccessIdCard ? 'text-emerald-600' : 'text-red-600'}`}>
              {membershipStatus?.canAccessIdCard ? 'Paid / Active' : 'Payment Required'}
            </span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Member #:</span>
            <span className="font-medium">{membershipStatus?.membership?.membershipNumber || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Payment Status Sidebar */}
      <PaymentStatusSidebar />

      {/* Profile Completion */}
      <div className="space-y-2 mt-4">
        <div className="text-xs font-medium text-gray-600">Profile Completion</div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${profileCompletion}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-gray-600">{profileCompletion}% complete</div>
      </div>
    </div>
  );
}
