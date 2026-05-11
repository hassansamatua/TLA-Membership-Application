'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiArrowLeft,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiCheck,
  FiX,
  FiEdit,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';

interface UserDetail {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  membership_number?: string;
  profile?: {
    personalInfo?: {
      fullName?: string;
      gender?: string;
      dateOfBirth?: string;
      nationality?: string;
      placeOfBirth?: string;
      profilePicture?: string;
    };
    contactInfo?: {
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
      postalCode?: string;
      socialMedia?: {
        facebook?: string;
        twitter?: string;
        linkedin?: string;
        instagram?: string;
      };
    };
    academicInfo?: {
      educationLevel?: string;
      institutionName?: string;
      yearOfCompletion?: string;
      fieldOfStudy?: string;
      skills?: string;
      additionalCertifications?: string;
    };
    professionalInfo?: {
      occupation?: string;
      employer?: string;
      workEmail?: string;
      yearsOfExperience?: string;
      skills?: string[];
    };
    employmentInfo?: {
      currentJobTitle?: string;
      currentCompany?: string;
      currentIndustry?: string;
      workExperience?: string;
      workAddress?: string;
      workPhone?: string;
      workEmail?: string;
    };
    membership?: {
      membershipType?: string;
      membershipNumber?: string;
      membershipStatus?: string;
      joinDate?: string;
      expiryDate?: string;
    };
  };
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserDetail>>({});

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchUserDetail();
  }, [isAuthLoading, isAuthenticated, user, resolvedParams.id]);

  const fetchUserDetail = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users/${resolvedParams.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch user details');
      const data = await response.json();
      setUserDetail(data);
      setEditForm(data);
    } catch (error) {
      console.error('Error fetching user detail:', error);
      toast.error('Failed to load user details');
      router.push('/admin/users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
const response = await fetch(`/api/admin/users/${resolvedParams.id}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to approve user');
      toast.success('User approved successfully');
      fetchUserDetail();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this user?')) return;
    
    try {
const response = await fetch(`/api/admin/users/${resolvedParams.id}/reject`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to reject user');
      toast.success('User rejected successfully');
      router.push('/admin/users');
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/admin/users/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });
      if (!response.ok) throw new Error('Failed to update user');
      toast.success('User updated successfully');
      setIsEditing(false);
      fetchUserDetail();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/admin/users/${resolvedParams.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete user');
      toast.success('User deleted successfully');
      router.push('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Not Found</h2>
          <p className="text-gray-600 mb-6">The user you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/admin/users')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/admin/users')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Details</h1>
            <p className="text-gray-600">View and manage user information</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FiEdit className="mr-2 h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <FiTrash2 className="mr-2 h-4 w-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm(userDetail);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FiX className="mr-2 h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <FiSave className="mr-2 h-4 w-4" />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  />
                ) : (
                  <p className="text-gray-900">{userDetail.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  />
                ) : (
                  <p className="text-gray-900">{userDetail.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Membership Number</label>
                <p className="text-gray-900">{userDetail.membership_number || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <p className="text-gray-900">{new Date(userDetail.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          {userDetail.profile && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
              <div className="space-y-4">
                {userDetail.profile.personalInfo && (
                  <div>
                    <h3 className="text-md font-medium text-gray-800 mb-2">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <p className="text-gray-900">{userDetail.profile.personalInfo.fullName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <p className="text-gray-900">{userDetail.profile.personalInfo.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <p className="text-gray-900">{userDetail.profile.personalInfo.dateOfBirth || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                        <p className="text-gray-900">{userDetail.profile.personalInfo.nationality || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {userDetail.profile.contactInfo && (
                  <div>
                    <h3 className="text-md font-medium text-gray-800 mb-2">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <p className="text-gray-900">{userDetail.profile.contactInfo.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <p className="text-gray-900">{userDetail.profile.contactInfo.address || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <p className="text-gray-900">{userDetail.profile.contactInfo.city || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <p className="text-gray-900">{userDetail.profile.contactInfo.country || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {userDetail.profile.membership && (
                  <div>
                    <h3 className="text-md font-medium text-gray-800 mb-2">Membership Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Membership Type</label>
                        <p className="text-gray-900">{userDetail.profile.membership.membershipType || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Membership Status</label>
                        <p className="text-gray-900">{userDetail.profile.membership.membershipStatus || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                        <p className="text-gray-900">{userDetail.profile.membership.joinDate || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <p className="text-gray-900">{userDetail.profile.membership.expiryDate || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {userDetail.profile.academicInfo && (
                  <div>
                    <h3 className="text-md font-medium text-gray-800 mb-2">Academic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Highest Degree</label>
                        <p className="text-gray-900">{userDetail.profile.academicInfo.educationLevel || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                        <p className="text-gray-900">{userDetail.profile.academicInfo.institutionName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                        <p className="text-gray-900">{userDetail.profile.academicInfo.fieldOfStudy || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year of Completion</label>
                        <p className="text-gray-900">{userDetail.profile.academicInfo.yearOfCompletion || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                        <p className="text-gray-900">{userDetail.profile.academicInfo.skills || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Certifications</label>
                        <p className="text-gray-900">{userDetail.profile.academicInfo.additionalCertifications || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {userDetail.profile.employmentInfo && (
                  <div>
                    <h3 className="text-md font-medium text-gray-800 mb-2">Employment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Job Title</label>
                        <p className="text-gray-900">{userDetail.profile.employmentInfo.currentJobTitle || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                        <p className="text-gray-900">{userDetail.profile.employmentInfo.currentCompany || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                        <p className="text-gray-900">{userDetail.profile.employmentInfo.currentIndustry || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Experience</label>
                        <p className="text-gray-900">{userDetail.profile.employmentInfo.workExperience || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
                        <p className="text-gray-900">{userDetail.profile.employmentInfo.workEmail || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Phone</label>
                        <p className="text-gray-900">{userDetail.profile.employmentInfo.workPhone || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Address</label>
                        <p className="text-gray-900">{userDetail.profile.employmentInfo.workAddress || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Admin</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  userDetail.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {userDetail.is_admin ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Approved</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  userDetail.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {userDetail.is_approved ? 'Yes' : 'Pending'}
                </span>
              </div>
            </div>

            {!userDetail.is_approved && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleApprove}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <FiCheck className="mr-2 h-4 w-4" />
                  Approve User
                </button>
                <button
                  onClick={handleReject}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  <FiX className="mr-2 h-4 w-4" />
                  Reject User
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/admin/payments?userId=${userDetail.id}`)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                View Payment History
              </button>
              <button
                onClick={() => router.push(`/admin/events?userId=${userDetail.id}`)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                View Event Attendance
              </button>
              <button
                onClick={() => window.location.href = `mailto:${userDetail.email}`}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
