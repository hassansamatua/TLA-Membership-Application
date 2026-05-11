'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FiBell, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSend,
  FiUsers,
  FiUser,
  FiCalendar,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';

interface News {
  id: number;
  title: string;
  message: string;
  type: 'news' | 'notification' | 'announcement' | 'urgent';
  targetAudience: 'all' | 'members' | 'admin' | 'specific';
  targetUsers?: number[];
  sender_name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  expiresAt?: string;
  sentAt: string;
}

export default function NewsManagementPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    type: 'news' | 'notification' | 'announcement' | 'urgent';
    targetAudience: 'all' | 'members' | 'admin' | 'specific';
    targetUsers: number[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    expiresAt: string;
  }>({
    title: '',
    message: '',
    type: 'news',
    targetAudience: 'all',
    targetUsers: [],
    priority: 'medium',
    expiresAt: ''
  });
  const [users, setUsers] = useState<{id: number; name: string; email: string}[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }
    if (isAuthenticated && user?.isAdmin) {
      fetchNews();
      fetchUsers();
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  const fetchNews = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/news?page=${page}&limit=${pagination.limit}`);
      if (response.ok) {
        const data = await response.json();
        setNews(data.news || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        targetUsers: formData.targetAudience === 'specific' ? formData.targetUsers : null,
        expiresAt: formData.expiresAt || null
      };

      const url = editingNews ? `/api/admin/news?id=${editingNews.id}` : '/api/admin/news';
      const method = editingNews ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setShowForm(false);
        setEditingNews(null);
        setFormData({
          title: '',
          message: '',
          type: 'news',
          targetAudience: 'all',
          targetUsers: [],
          priority: 'medium',
          expiresAt: ''
        });
        fetchNews(pagination.page);
        alert(editingNews ? 'News updated successfully!' : 'News sent successfully!');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting news:', error);
      alert('Error submitting news');
    }
  };

  const handleEdit = (newsItem: News) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      message: newsItem.message,
      type: newsItem.type,
      targetAudience: newsItem.targetAudience,
      targetUsers: newsItem.targetUsers || [],
      priority: newsItem.priority,
      expiresAt: newsItem.expiresAt ? new Date(newsItem.expiresAt).toISOString().split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (newsId: number) => {
    if (!confirm('Are you sure you want to delete this news?')) return;

    try {
      const response = await fetch(`/api/admin/news?id=${newsId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        fetchNews(pagination.page);
        alert('News deleted successfully!');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Error deleting news');
    }
  };

  const handleToggleActive = async (newsId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/news?id=${newsId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const result = await response.json();
      if (result.success) {
        fetchNews(pagination.page);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error toggling news:', error);
      alert('Error toggling news');
    }
  };

  const handleUserToggle = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      targetUsers: prev.targetUsers.includes(userId)
        ? prev.targetUsers.filter(id => id !== userId)
        : [...prev.targetUsers, userId]
    }));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'announcement': return 'bg-purple-100 text-purple-800';
      case 'notification': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">News Management</h1>
          <p className="text-gray-600">Send news and notifications to users</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <FiPlus className="mr-2 h-5 w-5" />
          Send News
        </button>
      </div>

      {/* News Form Modal */}
      {(showForm || editingNews) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingNews ? 'Edit News' : 'Send News'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'news' | 'notification' | 'announcement' | 'urgent' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="news">News</option>
                    <option value="notification">Notification</option>
                    <option value="announcement">Announcement</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value as 'all' | 'members' | 'admin' | 'specific' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Users</option>
                  <option value="members">Approved Members Only</option>
                  <option value="admin">Admins Only</option>
                  <option value="specific">Specific Users</option>
                </select>
              </div>

              {formData.targetAudience === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Users
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.targetUsers.includes(user.id)}
                          onChange={() => handleUserToggle(user.id)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="text-sm">{user.name} ({user.email})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires At (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingNews(null);
                    setFormData({
                      title: '',
                      message: '',
                      type: 'news',
                      targetAudience: 'all',
                      targetUsers: [],
                      priority: 'medium',
                      expiresAt: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {editingNews ? 'Update' : 'Send'} News
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* News List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent News</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FiBell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No news sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {news.map((newsItem) => (
              <div key={newsItem.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium text-gray-900">{newsItem.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(newsItem.type)}`}>
                        {newsItem.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(newsItem.priority)}`}>
                        {newsItem.priority}
                      </span>
                      {!newsItem.isActive && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{newsItem.message}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Target: {newsItem.targetAudience}</span>
                      <span>By: {newsItem.sender_name}</span>
                      <span>{new Date(newsItem.sentAt).toLocaleDateString()}</span>
                      {newsItem.expiresAt && (
                        <span>Expires: {new Date(newsItem.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(newsItem.id, newsItem.isActive)}
                      className={`p-2 rounded-md ${newsItem.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                      title={newsItem.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {newsItem.isActive ? <FiEye /> : <FiEyeOff />}
                    </button>
                    <button
                      onClick={() => handleEdit(newsItem)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDelete(newsItem.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} news
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchNews(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => fetchNews(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
