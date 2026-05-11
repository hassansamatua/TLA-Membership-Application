export interface MembershipYear {
  year: number;
  startDate: Date;
  endDate: Date;
  paymentDeadline: Date;
  gracePeriodEnd: Date;
  isPaid: boolean;
  paymentDate?: Date;
  amount?: number;
  penalty?: number;
}

export interface PaymentPlan {
  userId: number;
  membershipYears: MembershipYear[];
  totalAmount: number;
  penaltyAmount: number;
  dueAmount: number;
}

// Constants
export const MEMBERSHIP_FEE = 50000; // 50,000 TSH per year
export const PENALTY_FEE = 10000; // 10,000 TSH per year penalty
export const PAYMENT_MONTH = 1; // February (0-indexed)
export const GRACE_PERIOD_MONTH = 2; // March (0-indexed)

/**
 * Get membership year dates for a given year
 * Membership year runs from February to January of next year
 */
export function getMembershipYearDates(year: number): {
  startDate: Date;
  endDate: Date;
  paymentDeadline: Date;
  gracePeriodEnd: Date;
} {
  const startDate = new Date(year, PAYMENT_MONTH, 1); // February 1
  const endDate = new Date(year + 1, PAYMENT_MONTH - 1, 0); // January 31 of next year
  const paymentDeadline = new Date(year, PAYMENT_MONTH, 28); // February 28
  const gracePeriodEnd = new Date(year, GRACE_PERIOD_MONTH, 31); // March 31

  return {
    startDate,
    endDate,
    paymentDeadline,
    gracePeriodEnd
  };
}

/**
 * Get current membership year
 */
export function getCurrentMembershipYear(): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  
  // If current month is January (0), we're still in previous membership year
  if (currentMonth === 0) {
    return now.getFullYear() - 1;
  }
  
  // If current month is February or March, we're in current year
  if (currentMonth <= GRACE_PERIOD_MONTH) {
    return now.getFullYear();
  }
  
  // For other months, we're in current year's membership year
  return now.getFullYear();
}

/**
 * Calculate membership years for a user
 */
export function calculateMembershipYears(
  joinDate: Date,
  currentYear?: number
): MembershipYear[] {
  const years: MembershipYear[] = [];
  const today = new Date();
  const currentMembershipYear = currentYear || getCurrentMembershipYear();
  
  // Determine start year based on join date
  let startYear = joinDate.getFullYear();
  const joinMonth = joinDate.getMonth();
  
  // If joined in January, start from current membership year
  if (joinMonth === 0) {
    startYear = currentMembershipYear;
  } else if (joinMonth <= GRACE_PERIOD_MONTH) {
    // If joined during payment window (Feb-Mar), start from current year
    startYear = currentMembershipYear;
  } else {
    // If joined after March, start from next year
    startYear = currentMembershipYear + 1;
  }
  
  // Generate membership years from start year to current year + 2 (for advance payments)
  for (let year = startYear; year <= currentMembershipYear + 2; year++) {
    const dates = getMembershipYearDates(year);
    const isPastYear = year < currentMembershipYear;
    const isCurrentYear = year === currentMembershipYear;
    const isFutureYear = year > currentMembershipYear;
    
    const membershipYear: MembershipYear = {
      year,
      ...dates,
      isPaid: false,
      penalty: 0
    };
    
    // Calculate penalty for past unpaid years (only for renewals, not first year)
    if (isPastYear && !membershipYear.isPaid) {
      const isFirstYear = year === getFirstMembershipYear(joinDate);
      const hasPreviousPayments = years.filter(y => y.year < year && y.isPaid).length > 0;
      
      if (!isFirstYear && hasPreviousPayments) {
        membershipYear.penalty = PENALTY_FEE;
      }
    }
    
    // Calculate penalty for current year only if past grace period and not first year
    if (isCurrentYear && today > dates.gracePeriodEnd && !membershipYear.isPaid) {
      const isFirstYear = year === getFirstMembershipYear(joinDate);
      const hasPreviousPayments = years.filter(y => y.year < year && y.isPaid).length > 0;
      
      if (!isFirstYear && hasPreviousPayments) {
        membershipYear.penalty = PENALTY_FEE;
      }
    }
    
    years.push(membershipYear);
  }
  
  return years;
}

/**
 * Calculate payment plan for a user
 */
export function calculatePaymentPlan(
  userId: number,
  joinDate: Date,
  paidYears: number[] = [],
  selectedYears?: number[]
): PaymentPlan {
  const membershipYears = calculateMembershipYears(joinDate);
  
  // Mark paid years
  membershipYears.forEach(year => {
    if (paidYears.includes(year.year)) {
      year.isPaid = true;
    }
  });
  
  // Filter years to include (for payment calculation)
  let yearsToPay = membershipYears;
  if (selectedYears) {
    yearsToPay = membershipYears.filter(year => selectedYears.includes(year.year));
  }
  
  // Calculate amounts
  const totalAmount = yearsToPay.filter(y => !y.isPaid).length * MEMBERSHIP_FEE;
  const penaltyAmount = yearsToPay.reduce((sum, year) => sum + (year.penalty || 0), 0);
  const dueAmount = totalAmount + penaltyAmount;
  
  return {
    userId,
    membershipYears,
    totalAmount,
    penaltyAmount,
    dueAmount
  };
}

/**
 * Check if payment is overdue for a specific year
 */
export function isPaymentOverdue(year: MembershipYear): boolean {
  const now = new Date();
  return now > year.gracePeriodEnd && !year.isPaid;
}

/**
 * Get payment status text
 */
export function getPaymentStatusText(year: MembershipYear): string {
  if (year.isPaid) {
    return 'Paid';
  }
  
  const now = new Date();
  
  if (now <= year.paymentDeadline) {
    return 'Due Soon';
  }
  
  if (now <= year.gracePeriodEnd) {
    return 'Grace Period';
  }
  
  return `Overdue (+${PENALTY_FEE.toLocaleString()} TSH penalty)`;
}

/**
 * Format payment amount
 */
export function formatPaymentAmount(amount: number): string {
  return `${amount.toLocaleString()} TSH`;
}

/**
 * Get payment window dates for current year
 */
export function getCurrentPaymentWindow(): {
  startDate: Date;
  endDate: Date;
  deadline: Date;
  gracePeriodEnd: Date;
} {
  const currentYear = getCurrentMembershipYear();
  const dates = getMembershipYearDates(currentYear);
  
  return {
    startDate: dates.startDate,
    endDate: dates.gracePeriodEnd,
    deadline: dates.paymentDeadline,
    gracePeriodEnd: dates.gracePeriodEnd
  };
}

/**
 * Check if we're currently in payment window
 */
export function isInPaymentWindow(): boolean {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const membershipYear = getCurrentMembershipYear();
  
  // If we're in the same calendar year as membership year
  if (currentYear === membershipYear) {
    return currentMonth >= PAYMENT_MONTH && currentMonth <= GRACE_PERIOD_MONTH;
  }
  
  return false;
}

/**
 * Check if user's membership is currently expired
 */
export function isMembershipExpired(joinDate: Date, paidYears: number[]): boolean {
  const now = new Date();
  const currentMembershipYear = getCurrentMembershipYear();
  const dates = getMembershipYearDates(currentMembershipYear);
  
  // If current year is not paid and we're past March 31, membership is expired
  const currentYearPaid = paidYears.includes(currentMembershipYear);
  
  if (!currentYearPaid && now > dates.gracePeriodEnd) {
    return true;
  }
  
  return false;
}

/**
 * Check if user can view their membership ID
 */
export function canViewMembershipId(joinDate: Date, paidYears: number[]): boolean {
  return !isMembershipExpired(joinDate, paidYears);
}

/**
 * Get membership status
 */
export function getMembershipStatus(joinDate: Date, paidYears: number[]): {
  status: 'active' | 'grace_period' | 'expired';
  canViewId: boolean;
  message: string;
} {
  const now = new Date();
  const currentMembershipYear = getCurrentMembershipYear();
  const dates = getMembershipYearDates(currentMembershipYear);
  const currentYearPaid = paidYears.includes(currentMembershipYear);
  
  if (currentYearPaid) {
    return {
      status: 'active',
      canViewId: true,
      message: 'Membership is active'
    };
  }
  
  if (now <= dates.gracePeriodEnd) {
    return {
      status: 'grace_period',
      canViewId: true,
      message: `Payment due by ${dates.gracePeriodEnd.toLocaleDateString()}`
    };
  }
  
  // Past March 31 - membership expired
  return {
    status: 'expired',
    canViewId: false,
    message: `Membership expired on ${dates.gracePeriodEnd.toLocaleDateString()}. Pay ${formatPaymentAmount(MEMBERSHIP_FEE + PENALTY_FEE)} to renew.`
  };
}

/**
 * Calculate penalty - only applies after March 31 and for renewals (not first-time payments)
 */
export function calculatePenalty(joinDate: Date, paidYears: number[], year?: number): number {
  const now = new Date();
  const targetYear = year || getCurrentMembershipYear();
  const dates = getMembershipYearDates(targetYear);
  const isYearPaid = paidYears.includes(targetYear);
  
  // Check if this is a new user's first payment
  const isFirstYear = targetYear === getFirstMembershipYear(joinDate);
  const hasPreviousPayments = paidYears.length > 0;
  
  // Penalty only applies if:
  // 1. Year is not paid
  // 2. We're past March 31 of that year
  // 3. This is NOT the first year for a new user
  // 4. User has made at least one payment before (renewal scenario)
  if (!isYearPaid && now > dates.gracePeriodEnd && !isFirstYear && hasPreviousPayments) {
    return PENALTY_FEE;
  }
  
  return 0;
}

/**
 * Get the first membership year for a user
 */
export function getFirstMembershipYear(joinDate: Date): number {
  const joinMonth = joinDate.getMonth();
  const joinYear = joinDate.getFullYear();
  
  // If joined in January, first payment year is current membership year
  if (joinMonth === 0) {
    return getCurrentMembershipYear();
  }
  
  // If joined during payment window (Feb-Mar), first payment year is current year
  if (joinMonth <= GRACE_PERIOD_MONTH) {
    return getCurrentMembershipYear();
  }
  
  // If joined after March, first payment year is next year
  return getCurrentMembershipYear() + 1;
}

/**
 * Get next payment deadline
 */
export function getNextPaymentDeadline(): Date {
  const currentYear = getCurrentMembershipYear();
  const dates = getMembershipYearDates(currentYear);
  const now = new Date();
  
  // If we're past the grace period, next deadline is next year
  if (now > dates.gracePeriodEnd) {
    const nextYearDates = getMembershipYearDates(currentYear + 1);
    return nextYearDates.paymentDeadline;
  }
  
  return dates.paymentDeadline;
}
