"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiCreditCard, FiCheckCircle, FiAlertCircle, FiLoader, FiArrowLeft, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import { calculateMembershipPricing, getMembershipStatus } from '@/lib/membership-pricing';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import PhoneNumberInput from '@/components/PhoneNumberInput';

const paymentMethods = [
  { id: 'azampesa', displayName: 'AzamPesa' },
  { id: 'mpesa', displayName: 'M-Pesa' },
  { id: 'halopesa', displayName: 'HaloPesa' },
  { id: 'airtelmoney', displayName: 'Airtel Money' },
  { id: 'tigopesa', displayName: 'Tigo Pesa' },
  { id: 'bankcard', displayName: 'Bank Card' }
];

// Payment History Component
function PaymentHistory() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      try {
        const response = await fetch('/api/membership/status', { credentials: 'include' });
        const data = await response.json();
        
        if (data.success && data.payments) {
          setPayments(data.payments);
        } else {
          setError('Failed to load payment history');
        }
      } catch (err) {
        setError('Error loading payment history');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, []);

  const getCycleYear = (paymentDate: string) => {
    const date = new Date(paymentDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Membership cycles ALWAYS run from February 1 to January 31
    // Regardless of when payment is made, it covers the cycle year
    if (month === 0) { // January
      // Payment in January covers the current year cycle (Feb-Jan)
      return `${year}-${year + 1}`;
    } else { // February or later
      // Payment in Feb+ covers the current year cycle (Feb-Jan)
      return `${year}-${year + 1}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return `TZS ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <FiLoader className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FiAlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8">
        <FiCalendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No payment history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment, index) => (
        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="font-semibold text-gray-900">
                  {payment.source === 'membership_payment' ? 'Membership Payment' : 'Payment'}
                </span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {payment.status}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Cycle Year</p>
                  <p className="font-medium">{getCycleYear(payment.payment_date || payment.paid_at)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Amount Paid</p>
                  <p className="font-medium">{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Date</p>
                  <p className="font-medium">{formatDate(payment.payment_date || payment.paid_at)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Method</p>
                  <p className="font-medium">
                    {paymentMethods.find(m => m.id === payment.payment_method)?.displayName || payment.payment_method}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Reference</p>
                  <p className="font-medium text-xs">{payment.reference}</p>
                </div>
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-medium capitalize">{payment.source?.replace('_', ' ')}</p>
                </div>
              </div>
              
              {/* Penalty Information */}
              {payment.penalty_amount && payment.penalty_amount > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-red-800 text-sm font-medium">Late Payment Penalty Applied</p>
                  <p className="text-red-600 text-xs mt-1">
                    Penalty: {formatCurrency(payment.penalty_amount)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PaymentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [membershipType, setMembershipType] = useState<'personal' | 'organization'>('personal');
  const [pricing, setPricing] = useState<any>(null);
  const [membershipStatus, setMembershipStatus] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string>('');
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Auto-detect membership type from user profile
  useEffect(() => {
    const fetchUserMembershipType = async () => {
      try {
        const response = await fetch('/api/membership/status', { credentials: 'include' });
        const data = await response.json();
        
        if (data.success && data.plan) {
          setMembershipType(data.plan.type);
        }
      } catch (error) {
        console.error('Error fetching membership type:', error);
        // Fallback to URL parameter or default to personal
        const typeParam = searchParams.get('type');
        setMembershipType(typeParam === 'organization' ? 'organization' : 'personal');
      }
    };

    fetchUserMembershipType();
  }, [searchParams]);

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is new or continuing
    const calculatePricing = async () => {
      try {
        // Fetch membership status and payment history
        const response = await fetch('/api/membership/status', { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const data = await response.json();
        
        console.log('Membership status data:', data);
        console.log('Membership object:', data.membership);
        console.log('Payments array:', data.payments);
        
        // Check if user has any completed payments in any cycle year
        let hasAnyPayment = false;
        
        // Check if we have any payments in the response
        if (data.payments && data.payments.length > 0) {
          // Check for any completed payment regardless of the year
          hasAnyPayment = data.payments.some((p: any) => p.status === 'completed');
          console.log('Has any payment:', hasAnyPayment, data.payments);
        }
        
        // Check membership record for any payment
        let hasMembershipPayment = false;
        if (data.membership && data.membership.payment_status === 'paid' && data.membership.payment_date) {
          hasMembershipPayment = true;
          console.log('Has membership payment:', data.membership);
        }
        
        // User is new if they have no payments at all and no membership payment record
        const isNewUser = !hasAnyPayment && !hasMembershipPayment;
        
        // Force new user status if this is their first payment
        // This ensures new users always pay 40,000 TZS for their first payment
        if (isNewUser && !data.membership) {
          console.log('First time user - applying new user pricing');
        }
        console.log('Is new user:', isNewUser, { hasAnyPayment, hasMembershipPayment });
        
        console.log('User status:', { isNewUser, membership: data.membership });
        
        // Calculate pricing - force isNewUser to true if no membership exists
        const effectiveIsNewUser = !data.membership || isNewUser;
        console.log('Pricing calculation:', { 
          membershipType, 
          isNewUser, 
          effectiveIsNewUser,
          hasMembership: !!data.membership,
          hasAnyPayment
        });
        
        const pricingData = calculateMembershipPricing(membershipType, effectiveIsNewUser);
        console.log('Pricing data:', pricingData);
        setPricing(pricingData);

        // Get membership status - use API's active status and membership data
        const membershipData = data.membership;
        const isActive = data.fees?.totalDue === 0 || (data.fees?.baseAmount === 0 && data.fees?.penaltyAmount === 0); // API sets fees to 0 for active members
        let statusData = null;
        
        console.log('Is user active (from API):', isActive, 'fees:', data.fees);
        console.log('Membership data exists:', !!membershipData);
        console.log('Membership status:', membershipData?.status, 'payment status:', membershipData?.paymentStatus);
        
        if (isActive && membershipData) {
          // User has active membership
          const expiryDate = new Date(membershipData.expiryDate);
          const today = new Date();
          
          statusData = {
            status: 'active',
            daysUntilDue: Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
            penaltyAmount: 0,
            nextPaymentDue: new Date(today.getFullYear() + 1, 1, 1), // Next February 1st
            gracePeriodEnd: new Date(today.getFullYear(), 2, 31), // March 31st
            expiryDate: membershipData.expiryDate
          };
        } else {
          // Use the calculated status for non-active users
          const lastPaymentDate = data.membership?.payment_date ? new Date(data.membership.payment_date) : null;
          statusData = getMembershipStatus(lastPaymentDate, membershipType, isNewUser);
        }
        
        setMembershipStatus(statusData);
        console.log('Final membership status:', statusData, 'from membership data:', membershipData);

      } catch (error) {
        console.error('Error calculating pricing:', error);
        // Fallback pricing - assume new user
        const fallbackPricing = calculateMembershipPricing(membershipType, true);
        setPricing(fallbackPricing);
      } finally {
        setLoading(false);
      }
    };

    calculatePricing();
  }, [user, membershipType, router]);

  const handlePayment = async () => {
    if (!pricing || !user || !selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }

    // Check if user already paid for current cycle
    if (membershipStatus && membershipStatus.status === 'active') {
      setError('You have already paid for the current membership cycle. Your membership is active until ' + new Date(membershipStatus.expiryDate).toLocaleDateString());
      return;
    }

    // Show phone number input instead of direct payment
    setShowPhoneInput(true);
  };

  const handlePhoneNumberSubmit = async (phoneNumber: string) => {
    if (!pricing || !user || !selectedPaymentMethod || !phoneNumber) {
      setError('Missing payment information');
      return;
    }

    // Check if user already paid for current cycle
    if (membershipStatus && membershipStatus.status === 'active') {
      setError('You have already paid for the current membership cycle. Your membership is active until ' + new Date(membershipStatus.expiryDate).toLocaleDateString());
      return;
    }

    setPaymentLoading(true);
    setError(null);
    setUserPhoneNumber(phoneNumber);

    try {
      console.log('🔍 Starting AzamPay checkout with:', {
        membershipType,
        amount: pricing.totalDue,
        userId: user.id,
        paymentMethod: selectedPaymentMethod,
        phoneNumber,
        customerName: user.name,
        customerEmail: user.email,
      });

      // Use AzamPay checkout API with mobile money details - no PIN needed
      const response = await fetch('/api/payments/azampay/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipType,
          amount: pricing.totalDue,
          userId: user.id,
          paymentMethod: selectedPaymentMethod,
          phoneNumber,
          customerName: user.name,
          customerEmail: user.email,
        }),
      });

      console.log('📡 AzamPay checkout response status:', response.status);
      console.log('📡 AzamPay checkout response ok:', response.ok);

      const data = await response.json();
      console.log('📡 AzamPay checkout response data:', data);

      if (!response.ok) {
        console.error('❌ AzamPay checkout failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error || 'Unknown error'
        });
        throw new Error(data.error || `Failed to create payment checkout (HTTP ${response.status})`);
      }

      // Handle fallback scenario
      if (data.fallback) {
        console.log('ℹ️ Using fallback scenario');
        setPaymentUrl('fallback');
        setError(data.error);
        return;
      }

      // Success case
      if (data.checkoutUrl) {
        console.log('✅ Payment checkout created successfully');
        setPaymentUrl(data.checkoutUrl);
        
        // Show user message about phone prompt
        setError(`Redirecting to AzamPay... Check your ${selectedPaymentMethod} app for payment confirmation.`);
        
        // Log provider integration details
        console.log(`Payment initiated with ${selectedPaymentMethod}:`, {
          provider: selectedPaymentMethod,
          phone: phoneNumber,
          amount: pricing.totalDue,
          ussd: selectedPaymentMethod === 'mpesa' ? '*150*01#' :
                selectedPaymentMethod === 'azampesa' ? '*150*01#' :
                selectedPaymentMethod === 'halopesa' ? '*150*02#' :
                selectedPaymentMethod === 'airtelmoney' ? '*150*03#' :
                selectedPaymentMethod === 'tigopesa' ? '*150*04#' : '*150#'
        });
        
        // Redirect after a short delay to show the message
        setTimeout(() => {
          window.location.href = data.checkoutUrl;
        }, 2000);
      } else {
        console.error('❌ No checkout URL received:', data);
        throw new Error('No payment URL received from AzamPay');
      }
    } catch (err) {
      console.error('❌ Payment submission error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePhoneInputCancel = () => {
    setShowPhoneInput(false);
    setUserPhoneNumber('');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => showPhoneInput ? handlePhoneInputCancel() : router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="mr-2" />
            {showPhoneInput ? 'Back to Payment Methods' : 'Back to Dashboard'}
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {showPhoneInput ? 'Confirm Payment' : 
             (pricing?.year && pricing?.year > new Date().getFullYear() ? 
               'Next Cycle Membership Payment' : 'Membership Payment')}
          </h1>
          <p className="text-gray-600">
            {showPhoneInput 
              ? `Complete your ${paymentMethods.find(m => m.id === selectedPaymentMethod)?.displayName} payment`
              : `${membershipType === 'personal' ? 'Personal' : 'Organization'} Membership for ${pricing?.year}`
            }
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <FiAlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Loading */}
        {paymentLoading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <FiLoader className="h-5 w-5 text-blue-400 animate-spin mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Processing Payment</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {showPhoneInput ? 'Securing your payment...' : 'Redirecting you to secure payment gateway...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Phone Number Input Step */}
        {showPhoneInput && selectedPaymentMethod && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <PhoneNumberInput
              paymentMethod={selectedPaymentMethod}
              onPhoneNumberSubmit={handlePhoneNumberSubmit}
              onCancel={handlePhoneInputCancel}
              disabled={membershipStatus && membershipStatus.status === 'active'}
            />
          </div>
        )}

        {/* Regular Payment Flow */}
        {!showPhoneInput && (
          <>
            {membershipStatus && membershipStatus.status === 'active' ? (
              /* Active Member - Show only active status and next cycle payment */
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-center">
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <FiCheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Membership Active</h3>
                    <p className="text-green-700 mb-4">
                      Your membership is active until {new Date(membershipStatus.expiryDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      You can pay for the next cycle to continue your membership without interruption.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Clear current membership status and recalculate for next cycle
                      setMembershipStatus(null);
                      const nextYear = new Date().getFullYear() + 1;
                      const nextYearPricing = calculateMembershipPricing(membershipType, false, nextYear);
                      setPricing(nextYearPricing);
                    }}
                    className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mb-3"
                  >
                    <FiTrendingUp className="mr-2 h-5 w-5" />
                    Pay for Next Cycle
                  </button>
                  <button
                    onClick={() => setShowPaymentHistory(true)}
                    className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <FiCalendar className="mr-2 h-5 w-5" />
                    See Payment History
                  </button>
                  <div className="mt-4 text-center text-sm text-gray-600">
                    <p>Next cycle: February {new Date().getFullYear() + 1} - January {new Date().getFullYear() + 2}</p>
                    <p>Amount: TZS {membershipType === 'personal' ? '30,000' : '150,000'}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Non-Active Member - Show full payment flow */
              <>
                {/* Payment Method Selection */}
                <PaymentMethodSelector
                  selectedMethod={selectedPaymentMethod}
                  onMethodSelect={setSelectedPaymentMethod}
                  amount={pricing?.totalDue || 0}
                />

                {/* Pricing Details */}
                {pricing && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>
                    
                    <div className="space-y-4">
                      {/* Base Amount */}
                      <div className="flex justify-between items-center py-3 border-b">
                        <div>
                          <p className="font-medium text-gray-900">
                            {pricing.isNewUser ? 'New Member' : 'Continuing Member'} - {membershipType === 'personal' ? 'Personal' : 'Organization'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Membership period: February {pricing.year} - January {pricing.year + 1}
                          </p>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          TZS {pricing.baseAmount.toLocaleString()}
                        </p>
                      </div>

                      {/* Penalty */}
                      {pricing.penaltyAmount > 0 && (
                        <div className="flex justify-between items-center py-3 border-b">
                          <div>
                            <p className="font-medium text-red-600">Late Payment Penalty</p>
                            <p className="text-sm text-gray-600">
                              {pricing.penaltyAmount / 10000} year(s) × TZS 10,000
                            </p>
                          </div>
                          <p className="text-xl font-bold text-red-600">
                            TZS {pricing.penaltyAmount.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex justify-between items-center py-3">
                        <p className="text-lg font-semibold text-gray-900">Total Amount Due</p>
                        <p className="text-2xl font-bold text-green-600">
                          TZS {pricing.totalDue.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Status Information */}
                    {membershipStatus && (
                      <div className={`mt-4 p-4 rounded-lg ${
                        membershipStatus.status === 'active' ? 'bg-green-50 border border-green-200' :
                        membershipStatus.status === 'grace-period' ? 'bg-yellow-50 border border-yellow-200' :
                        membershipStatus.status === 'overdue' ? 'bg-red-50 border border-red-200' :
                        'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-center">
                          <FiCalendar className="h-5 w-5 mr-2" />
                          <div>
                            <p className="font-medium capitalize">
                              {membershipStatus.status.replace('-', ' ')}
                            </p>
                            {membershipStatus.status === 'grace-period' && (
                              <p className="text-sm text-gray-600">
                                {membershipStatus.daysUntilDue} days remaining until grace period ends
                              </p>
                            )}
                            {membershipStatus.status === 'overdue' && (
                              <p className="text-sm text-red-600">
                                Payment is overdue. Penalty of TZS {membershipStatus.penaltyAmount.toLocaleString()} applies.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Button */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <button
                    onClick={handlePayment}
                    disabled={paymentLoading || !pricing || !selectedPaymentMethod || (membershipStatus && membershipStatus.status === 'active')}
                    className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {paymentLoading ? (
                      <>
                        <FiLoader className="animate-spin mr-2 h-5 w-5" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiCreditCard className="mr-2 h-5 w-5" />
                        Pay TZS {pricing?.totalDue.toLocaleString() || '0'}
                        {selectedPaymentMethod && ` with ${paymentMethods.find(m => m.id === selectedPaymentMethod)?.displayName}`}
                      </>
                    )}
                  </button>

                  <div className="mt-4 text-center text-sm text-gray-600">
                    <p>Secure payment powered by AzamPay</p>
                    <p>You will be prompted to enter your mobile money details</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Information Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Membership Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Payment Schedule</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Membership year: February to January</li>
                <li>• Grace period: Until March 31st</li>
                <li>• Late penalty: TZS 10,000 per year</li>
                <li>• New members: TZS 40,000 (Personal)</li>
                <li>• Continuing: TZS 30,000 (Personal)</li>
                <li>• Organization: TZS 150,000</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Accepted Payment Methods</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Mobile Money (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa)</li>
                <li>• Bank Cards (Visa, Mastercard)</li>
                <li>• Bank Transfer</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Modal */}
      {showPaymentHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiArrowLeft className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <PaymentHistory />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
