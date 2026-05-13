'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiSearch,
  FiEye,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiX,
  FiXCircle,
  FiDownload,
  FiCalendar,
  FiMail,
  FiUser,
  FiClock,
} from 'react-icons/fi';

interface UserProfile {
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  bio?: string;
  profilePicture?: string;
  coverPhoto?: string;
  company?: string;
  jobTitle?: string;
  currentPosition?: string;
  industry?: string;
  yearsOfExperience?: number;
  skills?: string;
  highestDegree?: string;
  fieldOfStudy?: string;
  institution?: string;
  yearOfGraduation?: number;
  additionalCertifications?: string;
  areasOfInterest?: string;
  idProofPath?: string;
  degreeCertificatesPath?: string;
  cvPath?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  facebook?: string;
  instagram?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  idNumber?: string;
  passportNumber?: string;
  membershipNumber?: string;
  membershipType?: string;
  membershipStatus?: string;
  membershipExpiry?: string;
  joinDate?: string;
  personalInfo?: any;
  contactInfo?: any;
  education?: any;
  employment?: any;
  membershipInfo?: any;
  professionalCertifications?: string;
  linkedinProfile?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt?: string;
  profile?: UserProfile;
}

export default function AdminRequestsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectingUserId, setRejectingUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchPendingUsers();
  }, [isAuthLoading, isAuthenticated, user]);

  const fetchPendingUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users?status=pending', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch pending users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast.error('Failed to load pending users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to approve user');
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User approved successfully');
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (userId: number) => {
    setRejectingUserId(userId);
    setShowRejectionModal(true);
  };

  const confirmRejection = async () => {
    if (!rejectingUserId) return;
    
    try {
      const response = await fetch(`/api/admin/users/${rejectingUserId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (!response.ok) throw new Error('Failed to reject user');
      setUsers(users.filter(u => u.id !== rejectingUserId));
      toast.success('User rejected successfully');
      setShowRejectionModal(false);
      setRejectionReason('');
      setRejectingUserId(null);
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  const handleViewUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/details`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch user details');
      const userData = await response.json();
      setSelectedUser(userData);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      const response = await fetch('/api/admin/users/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds: selectedUsers }),
      });
      if (!response.ok) throw new Error('Failed to approve users');
      setUsers(users.filter(u => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
      toast.success(`${selectedUsers.length} users approved successfully`);
    } catch (error) {
      console.error('Error bulk approving users:', error);
      toast.error('Failed to approve users');
    }
  };

  const handleBulkReject = async () => {
    if (selectedUsers.length === 0) return;
    if (!confirm(`Are you sure you want to reject ${selectedUsers.length} users?`)) return;
    
    try {
      const response = await fetch('/api/admin/users/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds: selectedUsers }),
      });
      if (!response.ok) throw new Error('Failed to reject users');
      setUsers(users.filter(u => !selectedUsers.includes(u.id)));
      setSelectedUsers([]);
      toast.success(`${selectedUsers.length} users rejected successfully`);
    } catch (error) {
      console.error('Error bulk rejecting users:', error);
      toast.error('Failed to reject users');
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New User Requests</h1>
        <p className="text-gray-600">Review and approve/reject new user registration requests</p>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {users.length} pending request{users.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedUsers.length} user{selectedUsers.length === 1 ? '' : 's'} selected
            </span>
            <div className="space-x-2">
              <button
                onClick={handleBulkApprove}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-emerald-600 bg-emerald-100 hover:bg-emerald-200"
              >
                <FiCheck className="mr-1 h-3 w-3" />
                Approve Selected
              </button>
              <button
                onClick={handleBulkReject}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-600 bg-red-100 hover:bg-red-200"
              >
                <FiX className="mr-1 h-3 w-3" />
                Reject Selected
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'No users found matching your search' : 'No pending user requests'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <FiUser className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <FiClock className="mr-1 h-3 w-3" />
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FiCalendar className="mr-1 h-4 w-4" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <FiEye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="text-emerald-600 hover:text-emerald-900"
                          title="Approve User"
                        >
                          <FiCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReject(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Reject User"
                        >
                          <FiXCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowUserModal(false)}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Applied</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <FiClock className="mr-1 h-3 w-3" />
                        Pending
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Information */}
                {selectedUser.profile && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                    <div className="space-y-4">
                      {/* Personal Information */}
                      {(selectedUser.profile.dateOfBirth || selectedUser.profile.gender || selectedUser.profile.nationality) && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Personal Information</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {selectedUser.profile.dateOfBirth && (
                              <div>
                                <span className="text-gray-600">Date of Birth:</span>
                                <span className="ml-2 text-gray-900">{new Date(selectedUser.profile.dateOfBirth).toLocaleDateString()}</span>
                              </div>
                            )}
                            {selectedUser.profile.gender && (
                              <div>
                                <span className="text-gray-600">Gender:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.gender}</span>
                              </div>
                            )}
                            {selectedUser.profile.nationality && (
                              <div>
                                <span className="text-gray-600">Nationality:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.nationality}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Contact Information */}
                      {(selectedUser.profile.phone || selectedUser.profile.address || selectedUser.profile.city || selectedUser.profile.state || selectedUser.profile.country) && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Contact Information</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {selectedUser.profile.phone && (
                              <div>
                                <span className="text-gray-600">Phone:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.phone}</span>
                              </div>
                            )}
                            {selectedUser.profile.city && (
                              <div>
                                <span className="text-gray-600">City:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.city}</span>
                              </div>
                            )}
                            {selectedUser.profile.state && (
                              <div>
                                <span className="text-gray-600">State:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.state}</span>
                              </div>
                            )}
                            {selectedUser.profile.country && (
                              <div>
                                <span className="text-gray-600">Country:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.country}</span>
                              </div>
                            )}
                            {selectedUser.profile.address && (
                              <div className="md:col-span-2">
                                <span className="text-gray-600">Address:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Professional Information */}
                      {(selectedUser.profile.jobTitle || selectedUser.profile.company || selectedUser.profile.currentPosition || selectedUser.profile.industry || selectedUser.profile.yearsOfExperience) && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Professional Information</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {selectedUser.profile.jobTitle && (
                              <div>
                                <span className="text-gray-600">Job Title:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.jobTitle}</span>
                              </div>
                            )}
                            {selectedUser.profile.company && (
                              <div>
                                <span className="text-gray-600">Company:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.company}</span>
                              </div>
                            )}
                            {selectedUser.profile.currentPosition && (
                              <div>
                                <span className="text-gray-600">Current Position:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.currentPosition}</span>
                              </div>
                            )}
                            {selectedUser.profile.industry && (
                              <div>
                                <span className="text-gray-600">Industry:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.industry}</span>
                              </div>
                            )}
                            {selectedUser.profile.yearsOfExperience && (
                              <div>
                                <span className="text-gray-600">Years Experience:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.yearsOfExperience}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Education Information */}
                      {(selectedUser.profile.highestDegree || selectedUser.profile.fieldOfStudy || selectedUser.profile.institution || selectedUser.profile.yearOfGraduation) && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Education Information</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {selectedUser.profile.highestDegree && (
                              <div>
                                <span className="text-gray-600">Highest Degree:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.highestDegree}</span>
                              </div>
                            )}
                            {selectedUser.profile.fieldOfStudy && (
                              <div>
                                <span className="text-gray-600">Field of Study:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.fieldOfStudy}</span>
                              </div>
                            )}
                            {selectedUser.profile.institution && (
                              <div>
                                <span className="text-gray-600">Institution:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.institution}</span>
                              </div>
                            )}
                            {selectedUser.profile.yearOfGraduation && (
                              <div>
                                <span className="text-gray-600">Year of Graduation:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.yearOfGraduation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Skills and Expertise */}
                      {(selectedUser.profile.skills || selectedUser.profile.areasOfInterest || selectedUser.profile.additionalCertifications) && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Skills & Expertise</p>
                          <div className="space-y-2 text-sm">
                            {selectedUser.profile.skills && (
                              <div>
                                <span className="text-gray-600">Skills:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.skills}</span>
                              </div>
                            )}
                            {selectedUser.profile.areasOfInterest && (
                              <div>
                                <span className="text-gray-600">Areas of Interest:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.areasOfInterest}</span>
                              </div>
                            )}
                            {selectedUser.profile.additionalCertifications && (
                              <div>
                                <span className="text-gray-600">Additional Certifications:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.additionalCertifications}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Social Media */}
                      {(selectedUser.profile.linkedin || selectedUser.profile.twitter || selectedUser.profile.github || selectedUser.profile.website) && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Social Media & Web</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {selectedUser.profile.website && (
                              <div>
                                <span className="text-gray-600">Website:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.website}</span>
                              </div>
                            )}
                            {selectedUser.profile.linkedin && (
                              <div>
                                <span className="text-gray-600">LinkedIn:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.linkedin}</span>
                              </div>
                            )}
                            {selectedUser.profile.twitter && (
                              <div>
                                <span className="text-gray-600">Twitter:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.twitter}</span>
                              </div>
                            )}
                            {selectedUser.profile.github && (
                              <div>
                                <span className="text-gray-600">GitHub:</span>
                                <span className="ml-2 text-gray-900">{selectedUser.profile.github}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {selectedUser.profile.bio && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Bio</p>
                          <p className="text-sm text-gray-900">{selectedUser.profile.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedUser.id);
                      setShowUserModal(false);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                  >
                    <FiCheck className="inline mr-2 h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedUser.id);
                      setShowUserModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <FiXCircle className="inline mr-2 h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reject User</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this user. This will be sent to the user via email.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter rejection reason..."
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                    setRejectingUserId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRejection}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Reject User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
