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
  FiUser,
  FiUsers,
  FiFilter,
} from 'react-icons/fi';

interface User {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isApproved: boolean;
  status?: 'active' | 'pending' | 'rejected' | 'expired';
  createdAt: string;
  profile_picture?: string;
}

export default function MemberManagementPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'expired'>('all');

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
  }, [isAuthLoading, isAuthenticated, user]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users?t=${Date.now()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      console.log('📊 Users API Response:', {
        totalUsers: data.length,
        expiredUsers: data.filter((u: User) => u.status === 'expired').length,
        sampleUsers: data.slice(0, 3).map((u: User) => ({
          name: u.name,
          email: u.email,
          status: u.status
        }))
      });
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
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
      setUsers(users.map(u => u.id === userId ? { ...u, isApproved: true } : u));
      toast.success('User approved successfully');
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleReject = async (userId: number) => {
    if (!confirm('Are you sure you want to reject this user?')) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to reject user');
      setUsers(users.map(u => u.id === userId ? { ...u, isApproved: false } : u));
      toast.success('User rejected successfully');
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'approved') {
      return matchesSearch && user.isApproved;
    } else if (activeTab === 'pending') {
      return matchesSearch && !user.isApproved && user.status !== 'rejected' && user.status !== 'expired';
    } else if (activeTab === 'rejected') {
      return matchesSearch && user.status === 'rejected';
    } else if (activeTab === 'expired') {
      return matchesSearch && user.status === 'expired';
    }
    return matchesSearch;
  });

  const getTabCounts = () => {
    return {
      all: users.length,
      approved: users.filter(u => u.isApproved).length,
      pending: users.filter(u => !u.isApproved && u.status !== 'rejected' && u.status !== 'expired').length,
      rejected: users.filter(u => u.status === 'rejected').length,
      expired: users.filter(u => u.status === 'expired').length
    };
  };

  const tabCounts = getTabCounts();

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-green-700 to-green-500 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Member Management</h1>
              <p className="text-indigo-100 text-lg">View, edit, approve, and manage member accounts</p>
              <div className="flex items-center space-x-4 mt-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-sm font-medium">Total: {users.length}</span>
                </div>
                <div className="bg-green-900/30 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-sm font-medium">Active: {tabCounts.approved}</span>
                </div>
                <div className="bg-yellow-400/30 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-sm font-medium">Pending: {tabCounts.pending}</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                <FiUsers className="h-8 w-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm">Total Members</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-1 px-6" aria-label="Tabs">
            {[
              { key: 'all', label: 'All Users', count: tabCounts.all, color: 'gray' },
              { key: 'approved', label: 'Approved Users', count: tabCounts.approved, color: 'green' },
              { key: 'pending', label: 'Pending Users', count: tabCounts.pending, color: 'yellow' },
              { key: 'rejected', label: 'Rejected Users', count: tabCounts.rejected, color: 'red' },
              { key: 'expired', label: 'Expired Users', count: tabCounts.expired, color: 'gray' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.key
                    ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center">
                  {tab.label}
                  <span className={`ml-2 bg-${
                    activeTab === tab.key ? tab.color : 'gray'
                  }-100 text-${
                    activeTab === tab.key ? tab.color : 'gray'
                  }-600 py-0.5 px-2 rounded-full text-xs font-medium`}>
                    {tab.count}
                  </span>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-lg mb-6 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={`Search ${activeTab === 'all' ? 'all' : activeTab} users by name or email...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm">
              <FiFilter className="h-4 w-4 mr-2 inline" />
              Filters
            </button>
            <button className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm">
              <FiDownload className="h-4 w-4 mr-2 inline" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    className="rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="relative px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        {user.profile_picture ? (
                          <img 
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-200" 
                            src={user.profile_picture} 
                            alt={user.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '';
                              (e.target as HTMLImageElement).className = 'h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-gray-200';
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center ring-2 ring-gray-200">
                            <span className="text-white font-semibold text-lg">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      user.isAdmin
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : user.status === 'expired'
                        ? 'bg-gray-100 text-gray-800'
                        : user.isApproved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status === 'rejected' ? (
                        <>
                          <FiXCircle className="mr-1 h-3 w-3 inline" />
                          Rejected
                        </>
                      ) : user.status === 'expired' ? (
                        <>
                          <FiXCircle className="mr-1 h-3 w-3 inline" />
                          Expired
                        </>
                      ) : user.isApproved ? (
                        <>
                          <FiCheck className="mr-1 h-3 w-3 inline" />
                          Active
                        </>
                      ) : (
                        <>
                          <FiXCircle className="mr-1 h-3 w-3 inline" />
                          Pending
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-1">
                      <button
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FiEye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      {!user.isApproved && user.status !== 'rejected' && user.status !== 'expired' && (
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve User"
                        >
                          <FiCheck className="h-4 w-4" />
                        </button>
                      )}
                      {user.status === 'rejected' && (
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Re-approve User"
                        >
                          <FiCheck className="h-4 w-4" />
                        </button>
                      )}
                      {user.isApproved && user.status !== 'expired' && (
                        <button
                          onClick={() => handleReject(user.id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Reject User"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      )}
                      {user.status !== 'expired' && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedUsers.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-xl">
                <span className="font-semibold">{selectedUsers.length}</span>
                <span className="ml-1">user{selectedUsers.length === 1 ? '' : 's'} selected</span>
              </div>
              <button
                onClick={() => setSelectedUsers([])}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Clear selection
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // TODO: Implement bulk actions (approve, delete, export)
                  alert('Bulk actions coming soon!');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-green-700 bg-green-100 hover:bg-green-200 transition-colors"
              >
                <FiCheck className="mr-2 h-4 w-4" />
                Approve Selected
              </button>
              <button
                onClick={() => {
                  // TODO: Implement bulk export
                  alert('Bulk export coming soon!');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
              >
                <FiDownload className="mr-2 h-4 w-4" />
                Export Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
