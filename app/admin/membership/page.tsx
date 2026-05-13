'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiSettings,
  FiCheck,
  FiX,
  FiEye,
  FiRefreshCw,
} from 'react-icons/fi';

interface MembershipType {
  id: number;
  name: string;
  description: string;
  fee: number;
  currency: string;
  duration: number; // in months
  isActive: boolean;
  maxBorrowBooks: number;
  maxBorrowDays: number;
  createdAt: string;
  updatedAt: string;
}

interface MembershipCycle {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  penaltyRate: number; // percentage
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MembershipSetting {
  id: number;
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  category: 'general' | 'fees' | 'cycles' | 'notifications';
}

export default function AdminMembershipPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'types' | 'cycles' | 'settings'>('types');
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [membershipCycles, setMembershipCycles] = useState<MembershipCycle[]>([]);
  const [membershipSettings, setMembershipSettings] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isAuthLoading && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [isAuthLoading, isAuthenticated, user, activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let endpoint = '';
      switch (activeTab) {
        case 'types':
          endpoint = '/api/admin/membership/types';
          break;
        case 'cycles':
          endpoint = '/api/admin/membership/cycles';
          break;
        case 'settings':
          endpoint = '/api/admin/membership/settings';
          break;
      }

      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch ${activeTab}`);
      const data = await response.json();

      switch (activeTab) {
        case 'types':
          setMembershipTypes(data);
          break;
        case 'cycles':
          setMembershipCycles(data);
          break;
        case 'settings':
          setMembershipSettings(data);
          break;
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
      toast.error(`Failed to load ${activeTab}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let url = '';
      let method = 'POST';
      
      if (activeTab === 'types') {
        url = isEditing ? `/api/admin/membership/types/${selectedItem.id}` : '/api/admin/membership/types';
      } else if (activeTab === 'cycles') {
        url = isEditing ? `/api/admin/membership/cycles/${selectedItem.id}` : '/api/admin/membership/cycles';
      } else if (activeTab === 'settings') {
        url = `/api/admin/membership/settings/${selectedItem.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} ${activeTab.slice(0, -1)}`);

      toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)} ${isEditing ? 'updated' : 'created'} successfully`);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(`Error saving ${activeTab}:`, error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} ${activeTab.slice(0, -1)}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      let url = '';
      if (activeTab === 'types') {
        url = `/api/admin/membership/types/${id}`;
      } else if (activeTab === 'cycles') {
        url = `/api/admin/membership/cycles/${id}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete item');

      if (activeTab === 'types') {
        setMembershipTypes(membershipTypes.filter(t => t.id !== id));
      } else if (activeTab === 'cycles') {
        setMembershipCycles(membershipCycles.filter(c => c.id !== id));
      }

      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleToggleStatus = async (id: number, isActive: boolean) => {
    try {
      let url = '';
      if (activeTab === 'types') {
        url = `/api/admin/membership/types/${id}/toggle`;
      } else if (activeTab === 'cycles') {
        url = `/api/admin/membership/cycles/${id}/toggle`;
      }

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to toggle status');

      if (activeTab === 'types') {
        setMembershipTypes(membershipTypes.map(t => 
          t.id === id ? { ...t, isActive: !isActive } : t
        ));
      } else if (activeTab === 'cycles') {
        setMembershipCycles(membershipCycles.map(c => 
          c.id === id ? { ...c, isActive: !isActive } : c
        ));
      }

      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({});
    setSelectedItem(null);
    setIsEditing(false);
  };

  const openModal = (item?: any) => {
    if (item) {
      setSelectedItem(item);
      setFormData({ ...item });
      setIsEditing(true);
    } else {
      resetForm();
      if (activeTab === 'types') {
        setFormData({
          name: '',
          description: '',
          fee: 0,
          currency: 'TZS',
          duration: 12,
          isActive: true,
          maxBorrowBooks: 5,
          maxBorrowDays: 14,
        });
      } else if (activeTab === 'cycles') {
        setFormData({
          name: '',
          startDate: '',
          endDate: '',
          dueDate: '',
          penaltyRate: 10,
          isActive: true,
        });
      }
    }
    setShowModal(true);
  };

  const getFilteredData = () => {
    let data: any[] = [];
    if (activeTab === 'types') data = Array.isArray(membershipTypes) ? membershipTypes : [];
    else if (activeTab === 'cycles') data = Array.isArray(membershipCycles) ? membershipCycles : [];
    else if (activeTab === 'settings') data = membershipSettings ? [membershipSettings] : [];

    return data.filter(item =>
      Object.values(item).some(value =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

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
        <h1 className="text-2xl font-semibold text-gray-900">Membership</h1>
        <p className="text-gray-600">Manage membership types, cycles, and settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'types', label: 'Membership Types', icon: FiUsers },
            { key: 'cycles', label: 'Membership Cycles', icon: FiCalendar },
            { key: 'settings', label: 'Settings', icon: FiSettings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-2 h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          {activeTab !== 'settings' && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Add {activeTab.slice(0, -1)}
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {activeTab === 'types' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Limits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </>
                )}
                {activeTab === 'cycles' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cycle Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Penalty Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </>
                )}
                {activeTab === 'settings' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </>
                )}
                <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                    </div>
                  </td>
                </tr>
              ) : getFilteredData().length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? 'No items found matching your search' : `No ${activeTab} found`}
                  </td>
                </tr>
              ) : (
                getFilteredData().map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {activeTab === 'types' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <FiDollarSign className="h-4 w-4 mr-1" />
                            {(item.fee || 0).toLocaleString()} {item.currency || 'TZS'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.duration} months
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="text-xs">
                            <div>{item.maxBorrowBooks} books</div>
                            <div>{item.maxBorrowDays} days</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isActive ? <FiCheck className="h-3 w-3 mr-1" /> : <FiX className="h-3 w-3 mr-1" />}
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </>
                    )}
                    {activeTab === 'cycles' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="text-xs">
                            <div>{new Date(item.startDate).toLocaleDateString()}</div>
                            <div>to {new Date(item.endDate).toLocaleDateString()}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.penaltyRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isActive ? <FiCheck className="h-3 w-3 mr-1" /> : <FiX className="h-3 w-3 mr-1" />}
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </>
                    )}
                    {activeTab === 'settings' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.key}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">{item.value}</code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.description}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {activeTab !== 'settings' && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(item.id, item.isActive)}
                              className={`${
                                item.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-emerald-600 hover:text-emerald-900'
                              }`}
                              title={item.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {item.isActive ? <FiX className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => openModal(item)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit"
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {activeTab === 'settings' && (
                          <button
                            onClick={() => openModal(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit Setting"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditing ? `Edit ${activeTab.slice(0, -1)}` : `Add ${activeTab.slice(0, -1)}`}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {activeTab === 'types' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fee Amount
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formData.fee || ''}
                          onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Currency
                        </label>
                        <select
                          value={formData.currency || 'TZS'}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="TZS">TZS</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (months)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.duration || ''}
                          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Borrow Books
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.maxBorrowBooks || ''}
                          onChange={(e) => setFormData({ ...formData, maxBorrowBooks: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Borrow Days
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.maxBorrowDays || ''}
                          onChange={(e) => setFormData({ ...formData, maxBorrowDays: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive || false}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>
                  </>
                )}

                {activeTab === 'cycles' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cycle Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.startDate || ''}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.endDate || ''}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Due Date
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.dueDate || ''}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Penalty Rate (%)
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.penaltyRate || ''}
                          onChange={(e) => setFormData({ ...formData, penaltyRate: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isActive || false}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>
                    </div>
                  </>
                )}

                {activeTab === 'settings' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Setting Key
                      </label>
                      <input
                        type="text"
                        value={formData.key || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Value
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.value || ''}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                  >
                    {isEditing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
