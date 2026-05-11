'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiMail,
  FiCalendar,
  FiUser,
  FiEye,
  FiTrash2,
  FiDownload,
  FiRefreshCw,
} from 'react-icons/fi';

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  read_status: number;
  read_at?: string;
}

export default function ContactSubmissionsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchSubmissions();
  }, [isAuthLoading, isAuthenticated, user]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/contact-submissions', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load contact submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setShowModal(true);
  };

  const handleDeleteSubmission = async (id: number) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    
    try {
      const response = await fetch(`/api/admin/contact-submissions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete submission');
      
      // Find the submission to check if it was unread
      const submissionToDelete = submissions.find(s => s.id === id);
      const wasUnread = submissionToDelete?.read_status === 0;
      
      // Remove from state immediately for real-time update
      setSubmissions(prev => prev.filter(s => s.id !== id));
      
      // Emit custom event for real-time sidebar update
      if (wasUnread) {
        window.dispatchEvent(new CustomEvent('contactCountUpdate', {
          detail: { type: 'decrement', count: 1 }
        }));
      }
      
      toast.success('Submission deleted successfully');
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to delete submission');
    }
  };

  const handleToggleReadStatus = async (id: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 0 ? 1 : 0;
      const response = await fetch('/api/admin/contact-submissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: id,
          readStatus: newStatus
        }),
      });

      if (!response.ok) throw new Error('Failed to update read status');
      
      const result = await response.json();
      
      // Update state immediately for real-time update
      setSubmissions(prev => prev.map(s => 
        s.id === id 
          ? { 
              ...s, 
              read_status: newStatus,
              read_at: newStatus === 1 ? new Date().toISOString() : undefined
            } 
          : s
      ));
      
      // Emit custom event for real-time sidebar update
      const eventType = newStatus === 0 ? 'increment' : 'decrement';
      window.dispatchEvent(new CustomEvent('contactCountUpdate', {
        detail: { type: eventType, count: 1 }
      }));
      
      toast.success(result.message || `Submission marked as ${newStatus === 1 ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('Error updating read status:', error);
      toast.error('Failed to update read status');
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['ID', 'Name', 'Email', 'Subject', 'Message', 'Date'],
      ...submissions.map(s => [
        s.id.toString(),
        s.name,
        s.email,
        s.subject,
        s.message.replace(/\n/g, ' ').replace(/"/g, '""'),
        new Date(s.created_at).toLocaleString()
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Submissions exported successfully');
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
          <h1 className="text-2xl font-semibold text-gray-900">Contact Submissions</h1>
          <p className="text-gray-600">View and manage contact form submissions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchSubmissions}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FiRefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <FiDownload className="mr-2 h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full">
              <FiMail className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-2xl font-semibold text-gray-900">{submissions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-full">
              <FiMail className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unread</p>
              <p className="text-2xl font-semibold text-red-600">
                {submissions.filter(s => s.read_status === 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full">
              <FiMail className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Read</p>
              <p className="text-2xl font-semibold text-green-600">
                {submissions.filter(s => s.read_status === 1).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-full">
              <FiUser className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Senders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(submissions.map(s => s.email)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center">
            <FiMail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
            <p className="text-gray-600">Contact form submissions will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => (
                  <tr key={submission.id} className={`hover:bg-gray-50 ${submission.read_status === 0 ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        submission.read_status === 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {submission.read_status === 0 ? 'Unread' : 'Read'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{submission.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{submission.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-xs" title={submission.subject}>
                        {submission.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleReadStatus(submission.id, submission.read_status)}
                          className={`${
                            submission.read_status === 0 
                              ? 'text-blue-600 hover:text-blue-900' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          title={submission.read_status === 0 ? 'Mark as read' : 'Mark as unread'}
                        >
                          {submission.read_status === 0 ? '📖' : '📕'}
                        </button>
                        <button
                          onClick={() => handleViewSubmission(submission)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <FiEye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubmission(submission.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      {showModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Contact Submission Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Read Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedSubmission.read_status === 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedSubmission.read_status === 0 ? '📖 Unread' : '📕 Read'}
                      </span>
                      {selectedSubmission.read_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Marked as read: {new Date(selectedSubmission.read_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleToggleReadStatus(selectedSubmission.id, selectedSubmission.read_status);
                      setSelectedSubmission({
                        ...selectedSubmission,
                        read_status: selectedSubmission.read_status === 0 ? 1 : 0,
                        read_at: selectedSubmission.read_status === 0 ? new Date().toISOString() : undefined
                      });
                      
                      // Emit custom event for real-time sidebar update
                      const eventType = selectedSubmission.read_status === 0 ? 'decrement' : 'increment';
                      window.dispatchEvent(new CustomEvent('contactCountUpdate', {
                        detail: { type: eventType, count: 1 }
                      }));
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedSubmission.read_status === 0 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {selectedSubmission.read_status === 0 ? '📖 Mark as Read' : '📕 Mark as Unread'}
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedSubmission.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedSubmission.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedSubmission.subject}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedSubmission.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <a
                href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
              >
                <FiMail className="mr-2 h-4 w-4" />
                Reply via Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
