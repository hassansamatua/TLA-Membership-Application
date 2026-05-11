'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FiCalendar, 
  FiDollarSign, 
  FiUser, 
  FiCreditCard, 
  FiAlertCircle,
  FiCheck,
  FiX,
  FiClock,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi';
import { 
  MEMBERSHIP_FEE, 
  PENALTY_FEE, 
  getCurrentPaymentWindow,
  formatPaymentAmount,
  getPaymentStatusText,
  getMembershipStatus,
  isMembershipExpired,
  canViewMembershipId,
  type MembershipYear,
  type PaymentPlan
} from '@/lib/membershipPayment';

interface User {
  id: number;
  name: string;
  email: string;
  membershipType: string;
  joinDate: string;
}

interface PaymentData {
  user: User & {
    membershipNumber?: string;
    membershipStatus: 'active' | 'grace_period' | 'expired';
    canViewMembershipId: boolean;
    isExpired: boolean;
    isFirstYear: boolean;
  };
  paymentPlan: PaymentPlan;
  paymentWindow: {
    startDate: Date;
    endDate: Date;
    deadline: Date;
    gracePeriodEnd: Date;
  };
  payments: any[];
}

export default function PaymentManagementPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      fetchUsers();
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

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

  const fetchPaymentData = async (userId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/payments?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentData(data);
        setSelectedYears([]);
        setPaymentMethod('');
      } else {
        console.error('Error fetching payment data:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
    fetchPaymentData(userId);
  };

  const handleYearToggle = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const handlePayment = async () => {
    if (!selectedUserId || !selectedYears.length || !paymentMethod) {
      alert('Please select user, years, and payment method');
      return;
    }

    const paymentPlan = paymentData?.paymentPlan;
    if (!paymentPlan) return;

    const selectedYearsData = paymentPlan.membershipYears.filter(y => 
      selectedYears.includes(y.year) && !y.isPaid
    );

    const totalAmount = selectedYearsData.reduce((sum, year) => 
      sum + MEMBERSHIP_FEE + (year.penalty || 0), 0
    );

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          selectedYears,
          paymentMethod,
          amount: totalAmount,
          transactionId: `ADMIN-${Date.now()}`
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`Payment processed successfully!`);
        fetchPaymentData(selectedUserId);
        setSelectedYears([]);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paymentWindow = getCurrentPaymentWindow();
  const isInPaymentWindow = new Date() >= paymentWindow.startDate && new Date() <= paymentWindow.gracePeriodEnd;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Payment Management</h1>
        <p className="text-gray-600">Manage membership payments and track payment status</p>
      </div>

      {/* Payment Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiDollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Membership Fee</p>
              <p className="text-lg font-semibold">{formatPaymentAmount(MEMBERSHIP_FEE)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiAlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Penalty Fee</p>
              <p className="text-lg font-semibold">{formatPaymentAmount(PENALTY_FEE)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCalendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Payment Window</p>
              <p className="text-lg font-semibold">
                {isInPaymentWindow ? 'Open' : 'Closed'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiClock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Deadline</p>
              <p className="text-lg font-semibold">
                {paymentWindow.deadline.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Select Member</h2>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className={`p-3 border rounded-lg cursor-pointer mb-2 transition-colors ${
                      selectedUserId === user.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <FiUser className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">{user.membershipType}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="lg:col-span-2">
          {paymentData ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Payment Details - {paymentData.user.name}
                </h2>
              </div>
              
              <div className="p-4">
                {/* Membership Status Alert */}
                {paymentData.user.isExpired && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <FiAlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <div>
                        <p className="font-medium text-red-800">Membership Expired</p>
                        <p className="text-sm text-red-600">
                          Member cannot view their membership ID until payment is made.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!paymentData.user.isExpired && paymentData.user.membershipStatus === 'grace_period' && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <FiClock className="h-5 w-5 text-yellow-600 mr-2" />
                      <div>
                        <p className="font-medium text-yellow-800">Grace Period Active</p>
                        <p className="text-sm text-yellow-600">
                          Payment due by {paymentData.paymentWindow.gracePeriodEnd.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!paymentData.user.isExpired && paymentData.user.membershipStatus === 'active' && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <FiCheck className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="font-medium text-green-800">Membership Active</p>
                        <p className="text-sm text-green-600">
                          All payments are up to date
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Member Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Member Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Membership Number:</span>
                      <p className="font-medium">
                        {paymentData.user.canViewMembershipId && paymentData.user.membershipNumber 
                          ? paymentData.user.membershipNumber 
                          : 'Hidden (Expired)'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="font-medium capitalize">{paymentData.user.membershipStatus.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Member Since:</span>
                      <p className="font-medium">{new Date(paymentData.user.joinDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <p className="font-medium capitalize">{paymentData.user.membershipType}</p>
                    </div>
                  </div>
                  {paymentData.user.isFirstYear && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <p className="text-blue-800">
                        <strong>First Year Member:</strong> No penalty applies for first-time payment
                      </p>
                    </div>
                  )}
                </div>

                {/* Membership Years */}
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-900 mb-3">Membership Years</h3>
                  <div className="space-y-2">
                    {paymentData.paymentPlan.membershipYears.map(year => (
                      <div
                        key={year.year}
                        className={`p-3 border rounded-lg ${
                          year.isPaid 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedYears.includes(year.year)}
                              onChange={() => handleYearToggle(year.year)}
                              disabled={year.isPaid}
                              className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                {year.year} Membership Year
                              </p>
                              <p className="text-sm text-gray-600">
                                {year.startDate.toLocaleDateString()} - {year.endDate.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              year.isPaid ? 'text-green-600' : 'text-gray-900'
                            }`}>
                              {year.isPaid ? 'Paid' : formatPaymentAmount(MEMBERSHIP_FEE + (year.penalty || 0))}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getPaymentStatusText(year)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                {selectedYears.length > 0 && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-md font-medium text-gray-900 mb-2">Payment Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Membership Fees ({selectedYears.length} × {formatPaymentAmount(MEMBERSHIP_FEE)})</span>
                        <span>{formatPaymentAmount(selectedYears.length * MEMBERSHIP_FEE)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Penalty Fees</span>
                        <span>{formatPaymentAmount(
                          selectedYears.reduce((sum, year) => {
                            const yearData = paymentData.paymentPlan.membershipYears.find(y => y.year === year);
                            return sum + (yearData?.penalty || 0);
                          }, 0)
                        )}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>Total Amount</span>
                        <span>{formatPaymentAmount(
                          selectedYears.reduce((sum, year) => {
                            const yearData = paymentData.paymentPlan.membershipYears.find(y => y.year === year);
                            return sum + MEMBERSHIP_FEE + (yearData?.penalty || 0);
                          }, 0)
                        )}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Form */}
                {selectedYears.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-900 mb-3">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque'].map(method => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`p-3 border rounded-lg text-left transition-colors ${
                            paymentMethod === method
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <FiCreditCard className="h-4 w-4 mr-2 inline" />
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Process Payment Button */}
                {selectedYears.length > 0 && paymentMethod && (
                  <div className="flex justify-end">
                    <button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Process Payment'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FiUsers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a member to view payment details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
