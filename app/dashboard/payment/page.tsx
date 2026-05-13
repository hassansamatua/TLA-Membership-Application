"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FiCreditCard,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiArrowLeft,
  FiCalendar,
} from 'react-icons/fi';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import PhoneNumberInput from '@/components/PhoneNumberInput';
import CheckoutStepper from '@/components/payment/CheckoutStepper';
import CycleSelector, { CyclePricingRow } from '@/components/payment/CycleSelector';
import OrderSummary from '@/components/payment/OrderSummary';

const paymentMethods = [
  { id: 'azampesa', displayName: 'AzamPesa' },
  { id: 'mpesa', displayName: 'M-Pesa' },
  { id: 'halopesa', displayName: 'HaloPesa' },
  { id: 'airtelmoney', displayName: 'Airtel Money' },
  { id: 'mixxbyyas', displayName: 'Mixx By Yas' },
  { id: 'bankcard', displayName: 'Bank Card' },
];

const STEPS = [
  { id: 'cycle', label: 'Choose cycles', description: 'Pay current or prepay' },
  { id: 'method', label: 'Payment method', description: 'All networks supported' },
  { id: 'phone', label: 'Phone number', description: 'For the mobile prompt' },
  { id: 'review', label: 'Review & pay', description: 'Confirm and authorise' },
];

// Lightweight payment history list reused at the bottom of the page.
function PaymentHistory() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/membership/status', { credentials: 'include' });
        const d = await r.json();
        if (d?.success) {
          const list = Array.isArray(d.recentPayments) ? d.recentPayments : [];
          setPayments(list);
          if (list.length === 0) setError(null);
        } else {
          setError(d?.error || 'Could not load payment history');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load payment history');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <FiLoader className="animate-spin h-6 w-6 text-gray-400" />
      </div>
    );
  }
  if (error || payments.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-2">
        {error || 'No payments yet.'}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-gray-200">
      {payments.slice(0, 5).map((p, i) => (
        <li key={i} className="flex items-center justify-between py-3 text-sm">
          <div>
            <p className="font-medium text-gray-900">
              {p.source === 'membership_payment' ? 'Membership payment' : 'Payment'}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(p.payment_date || p.paid_at || p.created_at).toLocaleDateString()}
              {p.cycle_year ? ` · cycle ${p.cycle_year}` : ''}
            </p>
          </div>
          <p className="font-semibold text-emerald-700">
            TZS {Number(p.amount || 0).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function PaymentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status payload from /api/membership/status — drives the whole page.
  const [statusData, setStatusData] = useState<any>(null);

  // Step state. Steps: 0=cycle, 1=method, 2=phone, 3=review.
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedCycleYears, setSelectedCycleYears] = useState<number[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [authorized, setAuthorized] = useState(false);

  // Derived: cycle pricing rows + helper booleans.
  const cycles: CyclePricingRow[] = useMemo(
    () => statusData?.pricingPerCycle || [],
    [statusData]
  );
  const membershipType: 'personal' | 'organization' =
    statusData?.userCategory === 'organization' ? 'organization' : 'personal';

  // Load membership status (cycles + pricing) on mount.
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/membership/status', {
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data = await res.json();
        setStatusData(data);

        // Default selection: the current unpaid cycle. If everything is
        // paid up, preselect the next unpaid future cycle.
        const cs: CyclePricingRow[] = data?.pricingPerCycle || [];
        const firstUnpaid = cs.find((c) => !c.isPaid);
        if (firstUnpaid) {
          setSelectedCycleYears([firstUnpaid.cycleYear]);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load membership status');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, router]);

  // Prefill phone from user profile when we hit the phone step.
  useEffect(() => {
    if (!user) return;
    const u = user as any;
    const phone =
      u.phone ||
      u.profile?.phone ||
      (typeof u.profile?.contact_info === 'string'
        ? (() => {
            try {
              return JSON.parse(u.profile.contact_info).phone;
            } catch {
              return null;
            }
          })()
        : u.profile?.contact_info?.phone) ||
      '';
    if (phone) setPhoneNumber(phone);
  }, [user]);

  const selectedCycles = cycles.filter((c) =>
    selectedCycleYears.includes(c.cycleYear)
  );
  const totalAmount = selectedCycles.reduce((s, c) => s + c.totalDue, 0);
  const targetCycleYear =
    selectedCycleYears.length > 0 ? Math.min(...selectedCycleYears) : null;
  // Selected cycles MUST be contiguous starting at targetCycleYear so the
  // server can extend expiry to Jan 31 of (target + count - 1) + 1.
  const cycleCount = selectedCycleYears.length;

  const toggleCycle = (cy: number) => {
    setSelectedCycleYears((prev) => {
      const set = new Set(prev);
      if (set.has(cy)) set.delete(cy);
      else set.add(cy);
      return Array.from(set).sort((a, b) => a - b);
    });
  };

  const validateContiguous = (): string | null => {
    if (selectedCycleYears.length === 0) return 'Select at least one cycle.';
    const sorted = [...selectedCycleYears].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        return 'Selected cycles must be consecutive (e.g. 2026 + 2027, not 2026 + 2028).';
      }
    }
    return null;
  };

  const goNext = () => {
    setError(null);
    if (stepIndex === 0) {
      const err = validateContiguous();
      if (err) return setError(err);
    }
    if (stepIndex === 1 && !selectedMethod) {
      return setError('Pick a payment method to continue.');
    }
    if (stepIndex === 2 && !phoneNumber) {
      return setError('Enter the phone number to receive the payment prompt.');
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const submitPayment = async () => {
    setError(null);
    if (!user || !selectedMethod || !phoneNumber || !targetCycleYear || cycleCount < 1) {
      setError('Missing payment information.');
      return;
    }
    if (!authorized) {
      setError('Please authorise the mobile money debit to continue.');
      return;
    }
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payments/azampay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipType,
          amount: totalAmount,
          userId: (user as any).id,
          paymentMethod: selectedMethod,
          phoneNumber,
          customerName: (user as any).name,
          customerEmail: (user as any).email,
          targetCycleYear,
          cycleCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Checkout failed (HTTP ${res.status})`);
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error('No checkout URL returned from gateway.');
    } catch (e: any) {
      setError(e?.message || 'Payment failed.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FiLoader className="animate-spin h-10 w-10 text-emerald-600" />
      </div>
    );
  }

  // January-only reminder banner: identical content to the cron email.
  const today = new Date();
  const isJanuary = today.getMonth() === 0;
  const upcomingCycleYear = today.getFullYear();
  const activeExpiry = statusData?.membership?.expiryDate
    ? new Date(statusData.membership.expiryDate)
    : null;
  const activeCovers = activeExpiry
    ? activeExpiry >= new Date(upcomingCycleYear + 1, 0, 31)
    : false;
  const showJanuaryBanner = isJanuary && !activeCovers;

  const providerLabel =
    paymentMethods.find((m) => m.id === selectedMethod)?.displayName || null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32 lg:pb-12">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </button>
          <span className="text-xs text-gray-500">
            Tanzania Library Association · Membership checkout
          </span>
        </div>

        {showJanuaryBanner && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <FiCalendar className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                New cycle starts February 1
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                Pay between Feb 1 and Mar 31 to avoid the TZS 1,000/month late
                penalty starting April 1.
              </p>
            </div>
          </div>
        )}

        {/* Stepper */}
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <CheckoutStepper
            steps={STEPS}
            currentIndex={stepIndex}
            onStepClick={(i) => setStepIndex(i)}
          />
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <FiAlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Two-column layout: steps + sticky summary */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Left: stepper content */}
          <div className="space-y-6">
            {stepIndex === 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <CycleSelector
                  cycles={cycles}
                  selectedYears={selectedCycleYears}
                  onToggle={toggleCycle}
                  maxSelectable={statusData?.maxCycleCount || 3}
                />
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={goNext}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Continue
                  </button>
                </div>
              </section>
            )}

            {stepIndex === 1 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <PaymentMethodSelector
                  selectedMethod={selectedMethod}
                  onMethodSelect={setSelectedMethod}
                  amount={totalAmount}
                />
                <div className="mt-6 flex justify-between">
                  <button
                    onClick={goBack}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={goNext}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Continue
                  </button>
                </div>
              </section>
            )}

            {stepIndex === 2 && selectedMethod && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">
                  Phone number for the payment prompt
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Use the number registered with{' '}
                  <span className="font-medium">{providerLabel}</span>. You'll
                  approve the debit on that handset.
                </p>
                <div className="mt-4">
                  <PhoneNumberInput
                    paymentMethod={selectedMethod}
                    onPhoneNumberSubmit={(p: string) => {
                      setPhoneNumber(p);
                      setStepIndex(3);
                    }}
                    onCancel={goBack}
                  />
                </div>
              </section>
            )}

            {stepIndex === 3 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">
                  Review &amp; pay
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-gray-500">Membership type</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {membershipType === 'organization'
                      ? 'Organization'
                      : 'Personal'}
                  </dd>
                  <dt className="text-gray-500">Cycles</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {selectedCycleYears.join(', ')} ({cycleCount} cycle
                    {cycleCount === 1 ? '' : 's'})
                  </dd>
                  <dt className="text-gray-500">Payment method</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {providerLabel}
                  </dd>
                  <dt className="text-gray-500">Phone number</dt>
                  <dd className="text-right font-medium text-gray-900">
                    {phoneNumber}
                  </dd>
                </dl>

                <label className="mt-6 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(e) => setAuthorized(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">
                    I authorise Tanzania Library Association to debit TZS{' '}
                    <span className="font-semibold">
                      {totalAmount.toLocaleString()}
                    </span>{' '}
                    from my {providerLabel} account for the selected
                    membership cycle{cycleCount > 1 ? 's' : ''}.
                  </span>
                </label>

                {paymentLoading && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    <FiLoader className="h-4 w-4 animate-spin" />
                    Awaiting confirmation on your phone… you'll be redirected
                    automatically.
                  </div>
                )}

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={goBack}
                    disabled={paymentLoading}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={submitPayment}
                    disabled={paymentLoading || !authorized}
                    className={`inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all ${
                      paymentLoading || !authorized
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {paymentLoading ? (
                      <>
                        <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                        Processing
                      </>
                    ) : (
                      <>
                        <FiCreditCard className="mr-2 h-4 w-4" />
                        Pay TZS {totalAmount.toLocaleString()}
                      </>
                    )}
                  </button>
                </div>
              </section>
            )}

            {/* Recent payments */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Recent payments
              </h3>
              <PaymentHistory />
            </section>

            {/* Membership info */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-sm text-gray-600">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Membership rules
              </h3>
              <ul className="space-y-1">
                <li>• Cycle runs February 1 — January 31.</li>
                <li>• Pay anytime between Feb 1 and Mar 31 with no penalty.</li>
                <li>
                  • From April 1, late penalty is TZS 1,000 per month elapsed.
                </li>
                <li>
                  • Prepay up to 3 cycles in one transaction — no discount, no
                  hidden fees.
                </li>
                <li>
                  • Receipt is sent automatically by <strong>email and SMS</strong>{' '}
                  the moment payment confirms.
                </li>
                <li>
                  • All mobile networks supported via AzamPay: AzamPesa, M-Pesa,
                  HaloPesa, Airtel Money, Mixx By Yas, plus bank card.
                </li>
              </ul>
            </section>
          </div>

          {/* Right: sticky summary (also bottom sheet on mobile) */}
          <OrderSummary
            cycles={cycles}
            selectedYears={selectedCycleYears}
            providerLabel={providerLabel}
            ctaLabel={
              stepIndex < 3
                ? `Continue · TZS ${totalAmount.toLocaleString()}`
                : `Pay TZS ${totalAmount.toLocaleString()}`
            }
            ctaDisabled={
              selectedCycleYears.length === 0 ||
              (stepIndex === 3 && !authorized) ||
              !!validateContiguous()
            }
            ctaLoading={paymentLoading}
            onCta={() => {
              if (stepIndex < 3) goNext();
              else submitPayment();
            }}
          />
        </div>
      </div>
    </div>
  );
}
