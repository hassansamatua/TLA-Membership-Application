// Membership pricing logic based on TLA requirements
// NEW USER: 40,000 TZS
// CONTINUING USER: 30,000 TZS

export interface MembershipPricing {
  baseAmount: number;
  penaltyAmount: number;
  totalDue: number;
  isNewUser: boolean;
  membershipType: 'personal' | 'organization';
  year: number;
  isLate: boolean;
  gracePeriodEnd: Date;
}

export function calculateMembershipPricing(
  membershipType: 'personal' | 'organization',
  isNewUser: boolean,
  currentYear: number = new Date().getFullYear()
): MembershipPricing {
  // Enhanced pricing based on user categories
  const basePrices = {
    personal: {
      new: 40000,      // New members pay 40,000 TZS for their first payment
      continuing: 30000 // Renewal/continuing members pay 30,000 TZS
    },
    organization: 50000 // Updated from 150,000 to 50,000 TZS
  };

  // Force new user pricing if it's their first payment
  const effectiveIsNewUser = isNewUser;
  
  const baseAmount = membershipType === 'personal' 
    ? (effectiveIsNewUser ? basePrices.personal.new : basePrices.personal.continuing)
    : basePrices.organization;

  // Year cycle: February to January
  const yearStart = new Date(currentYear, 1, 1); // February 1st
  const yearEnd = new Date(currentYear + 1, 0, 31); // January 31st next year
  const gracePeriodEnd = new Date(currentYear, 2, 31); // March 31st
  
  const today = new Date();
  const isLate = today > gracePeriodEnd;

  // Calculate penalty (1,000 TZS per month after April 1, for continuing users only)
  let penaltyAmount = 0;
  if (isLate && !effectiveIsNewUser) {
    // Only apply penalty to continuing members who are late
    const penaltyStartDate = new Date(currentYear, 3, 1); // April 1st
    if (today >= penaltyStartDate) {
      const monthsLate = Math.max(0, Math.floor((today.getTime() - penaltyStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      penaltyAmount = monthsLate * 1000; // 1,000 TZS per month
    }
  }

  const totalDue = baseAmount + penaltyAmount;

  return {
    baseAmount,
    penaltyAmount,
    totalDue,
    isNewUser: effectiveIsNewUser,
    membershipType,
    year: currentYear,
    isLate,
    gracePeriodEnd
  };
}

export function getMembershipStatus(
  lastPaymentDate: Date | null,
  membershipType: 'personal' | 'organization',
  isNewUser: boolean = false
): {
  status: 'active' | 'grace-period' | 'overdue' | 'expired';
  daysUntilDue: number;
  penaltyAmount: number;
  nextPaymentDue: Date;
  gracePeriodEnd: Date;
} {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Year cycle: February to January
  const yearStart = new Date(currentYear, 1, 1); // February 1st
  const gracePeriodEnd = new Date(currentYear, 2, 31); // March 31st
  const nextPaymentDue = new Date(currentYear + 1, 1, 1); // Next February 1st

  let status: 'active' | 'grace-period' | 'overdue' | 'expired';
  let daysUntilDue = 0;
  let penaltyAmount = 0;

  if (!lastPaymentDate) {
    // No payment ever made
    if (today <= gracePeriodEnd) {
      status = 'grace-period';
      daysUntilDue = Math.ceil((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      status = 'overdue';
      const yearsOverdue = Math.floor((today.getTime() - gracePeriodEnd.getTime()) / (365 * 24 * 60 * 60 * 1000));
      penaltyAmount = yearsOverdue * 10000;
    }
  } else {
    // Has previous payment
    const paymentYear = lastPaymentDate.getFullYear();
    const paymentMonth = lastPaymentDate.getMonth();
    
    // Check if payment covers current year
    if (paymentYear === currentYear && paymentMonth >= 1) { // Paid in current year cycle
      status = 'active';
      daysUntilDue = Math.ceil((nextPaymentDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else if (paymentYear === currentYear - 1 && paymentMonth >= 1) {
      // Paid last year, check if still in grace period
      if (today <= gracePeriodEnd) {
        status = 'grace-period';
        daysUntilDue = Math.ceil((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        status = 'overdue';
        const yearsOverdue = Math.floor((today.getTime() - gracePeriodEnd.getTime()) / (365 * 24 * 60 * 60 * 1000));
        penaltyAmount = yearsOverdue * 10000;
      }
    } else {
      // Payment too old or doesn't cover current year
      status = 'expired';
      const yearsOverdue = currentYear - paymentYear;
      penaltyAmount = yearsOverdue * 10000;
    }
  }

  return {
    status,
    daysUntilDue,
    penaltyAmount,
    nextPaymentDue,
    gracePeriodEnd
  };
}
