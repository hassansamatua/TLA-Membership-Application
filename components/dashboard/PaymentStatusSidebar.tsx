"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FiCreditCard, FiCheckCircle, FiAlertCircle, FiClock, FiCalendar, FiExternalLink } from 'react-icons/fi';

interface MembershipPayment {
  id: number;
  membership_type: string;
  status: string;
  payment_status: string;
  payment_date?: string;
  amount_paid?: number;
  expiry_date: string;
  created_at: string;
}

interface PaymentYearStatus {
  year: number;
  status: 'paid' | 'pending' | 'overdue' | 'expired';
  membership?: MembershipPayment;
  canPayForNextYear: boolean;
}

export default function PaymentStatusSidebar() {
  const { user } = useAuth();
  const [paymentStatus, setPaymentStatus] = useState<PaymentYearStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPaymentStatus();
    }
  }, [user]);

  const fetchPaymentStatus = async () => {
    try {
      console.log('Fetching payment status...');
      const response = await fetch('/api/membership/payment-status', {
        credentials: 'include', // Use cookies like other APIs
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Payment status response:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('Payment status data:', data);
      
      if (response.ok) {
        setPaymentStatus(data.years || []);
        console.log('Payment years loaded:', data.years?.length || 0);
      } else {
        console.error('Payment status API error:', data.error);
        // Fallback: create mock data to show the UI structure
        const currentYear = new Date().getFullYear();
        setPaymentStatus([
          {
            year: currentYear,
            status: 'pending',
            canPayForNextYear: false,
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching payment status:', error);
      // Fallback: show mock data
      const currentYear = new Date().getFullYear();
      setPaymentStatus([
        {
          year: currentYear,
          status: 'pending',
          canPayForNextYear: false,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <FiCheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <FiClock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <FiAlertCircle className="h-4 w-4 text-red-500" />;
      case 'expired':
        return <FiAlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <FiClock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'overdue':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'expired':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
        <FiCreditCard className="h-5 w-5 text-gray-500" />
      </div>

      <div className="space-y-3">
        {paymentStatus.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <FiCreditCard className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No payment history found</p>
          </div>
        ) : (
          paymentStatus.map((yearStatus) => (
            <div
              key={yearStatus.year}
              className={`border rounded-lg p-3 transition-all hover:shadow-sm ${getStatusColor(yearStatus.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(yearStatus.status)}
                  <span className="font-medium">{yearStatus.year}</span>
                </div>
                <span className="text-xs font-medium uppercase">
                  {getStatusText(yearStatus.status)}
                </span>
              </div>

              {yearStatus.membership && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{yearStatus.membership.membership_type}</span>
                  </div>
                  
                  {yearStatus.membership.amount_paid && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">{formatCurrency(yearStatus.membership.amount_paid)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">Expiry:</span>
                    <span className="font-medium">{formatDate(yearStatus.membership.expiry_date)}</span>
                  </div>

                  {yearStatus.membership.payment_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid:</span>
                      <span className="font-medium">{formatDate(yearStatus.membership.payment_date)}</span>
                    </div>
                  )}
                </div>
              )}

              {yearStatus.canPayForNextYear && (
                <div className="mt-3 pt-2 border-t border-current border-opacity-20">
                  <a
                    href="/dashboard/payment"
                    className="flex items-center justify-center text-xs font-medium hover:underline"
                  >
                    <FiCreditCard className="h-3 w-3 mr-1" />
                    Pay for {yearStatus.year + 1}
                    <FiExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              )}

              {yearStatus.status === 'overdue' && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  ⚠️ Payment overdue - Renew now
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <a
          href="/dashboard/payment"
          className="w-full flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
        >
          <FiCreditCard className="h-4 w-4 mr-2" />
          Make Payment
        </a>
      </div>
    </div>
  );
}
