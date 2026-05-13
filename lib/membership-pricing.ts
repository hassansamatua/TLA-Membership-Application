// Membership pricing (legacy entry point).
//
// This module is kept for backwards-compatibility with existing imports
// (notably `app/dashboard/payment/page.tsx`). All numeric logic is now
// delegated to the canonical helpers in `./enhancedMembershipCycles`:
//
//   - Fees:    getMembershipFee()
//   - Penalty: calculateEnhancedPenalties() (1,000 TZS per whole month
//              elapsed since April 1; new members are exempt)
//   - Cycle:   Feb 1 -> Jan 31; grace period ends Mar 31
//
// The previous implementation here used `yearsOverdue * 10,000` and other
// non-canonical figures that no longer match the rules in the project
// requirements; this rewrite fixes the regression while keeping the same
// public function names and return shapes.

// NOTE: We intentionally do NOT import from `./enhancedMembershipCycles`
// here because that module pulls in `./db` (mysql2 + node `fs`/`tls`).
// This file is consumed by the client component
// `app/dashboard/payment/page.tsx`, so we keep it server-agnostic by
// inlining the pure config + math. Keep this in sync with
// ENHANCED_MEMBERSHIP_CONFIG and calculateEnhancedPenalties.
const ENHANCED_MEMBERSHIP_CONFIG = {
  LIBRARIAN_FIRST_YEAR: 40000,
  LIBRARIAN_RENEWAL: 30000,
  ORGANIZATION_FEE: 150000,
  REGULAR_FIRST_YEAR: 40000,
  REGULAR_RENEWAL: 30000,
  PENALTY_PER_MONTH: 1000,
  GRACE_PERIOD_END_MONTH: 3,
  GRACE_PERIOD_END_DAY: 31,
  PENALTY_START_MONTH: 4, // April (1-indexed)
} as const;

function getMembershipFee(args: {
  category: 'librarian' | 'organization' | 'regular';
  isNewUser: boolean;
}): { baseAmount: number } {
  const { category, isNewUser } = args;
  if (category === 'organization') {
    return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.ORGANIZATION_FEE };
  }
  if (category === 'librarian') {
    return {
      baseAmount: isNewUser
        ? ENHANCED_MEMBERSHIP_CONFIG.LIBRARIAN_FIRST_YEAR
        : ENHANCED_MEMBERSHIP_CONFIG.LIBRARIAN_RENEWAL,
    };
  }
  return {
    baseAmount: isNewUser
      ? ENHANCED_MEMBERSHIP_CONFIG.REGULAR_FIRST_YEAR
      : ENHANCED_MEMBERSHIP_CONFIG.REGULAR_RENEWAL,
  };
}

function calculateEnhancedPenalties(args: {
  cycleYear: number;
  now: Date;
  isNewUser: boolean;
}): { penaltyAmount: number } {
  const { cycleYear, now, isNewUser } = args;
  if (isNewUser) return { penaltyAmount: 0 };
  const penaltyStart = new Date(
    cycleYear,
    ENHANCED_MEMBERSHIP_CONFIG.PENALTY_START_MONTH - 1,
    1
  );
  if (now < penaltyStart) return { penaltyAmount: 0 };
  // Whole calendar months elapsed since April 1 of cycleYear.
  const months =
    (now.getFullYear() - penaltyStart.getFullYear()) * 12 +
    (now.getMonth() - penaltyStart.getMonth()) +
    1; // +1 so that April itself counts as month #1
  return {
    penaltyAmount: Math.max(0, months) * ENHANCED_MEMBERSHIP_CONFIG.PENALTY_PER_MONTH,
  };
}

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

function categoryFor(
  membershipType: 'personal' | 'organization'
): 'librarian' | 'organization' | 'regular' {
  return membershipType === 'organization' ? 'organization' : 'regular';
}

export function calculateMembershipPricing(
  membershipType: 'personal' | 'organization',
  isNewUser: boolean,
  currentYear: number = new Date().getFullYear()
): MembershipPricing {
  const category = categoryFor(membershipType);
  const { baseAmount } = getMembershipFee({ category, isNewUser });

  const gracePeriodEnd = new Date(
    currentYear,
    ENHANCED_MEMBERSHIP_CONFIG.GRACE_PERIOD_END_MONTH - 1,
    ENHANCED_MEMBERSHIP_CONFIG.GRACE_PERIOD_END_DAY
  );
  const today = new Date();
  const isLate = today > gracePeriodEnd;

  const { penaltyAmount } = calculateEnhancedPenalties({
    cycleYear: currentYear,
    now: today,
    isNewUser,
  });

  const totalDue = baseAmount + penaltyAmount;

  return {
    baseAmount,
    penaltyAmount,
    totalDue,
    isNewUser,
    membershipType,
    year: currentYear,
    isLate,
    gracePeriodEnd,
  };
}

/**
 * Lightweight status helper used by the user dashboard for the "where am I
 * in the cycle" widget. Uses the canonical penalty formula
 * (1,000 TZS per whole calendar month past April 1).
 */
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
  const category = categoryFor(membershipType);

  const gracePeriodEnd = new Date(
    currentYear,
    ENHANCED_MEMBERSHIP_CONFIG.GRACE_PERIOD_END_MONTH - 1,
    ENHANCED_MEMBERSHIP_CONFIG.GRACE_PERIOD_END_DAY
  );
  const nextPaymentDue = new Date(currentYear + 1, 1, 1); // next Feb 1

  // Canonical penalty math, applied uniformly regardless of branch below.
  // `baseAmount` is resolved for type-completeness; the local helper does
  // not need it but we keep the call so signature drift here is obvious.
  void getMembershipFee({ category, isNewUser });
  const { penaltyAmount: canonicalPenalty } = calculateEnhancedPenalties({
    cycleYear: currentYear,
    now: today,
    isNewUser,
  });

  let status: 'active' | 'grace-period' | 'overdue' | 'expired';
  let daysUntilDue = 0;
  let penaltyAmount = 0;

  if (!lastPaymentDate) {
    if (today <= gracePeriodEnd) {
      status = 'grace-period';
      daysUntilDue = Math.ceil(
        (gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
    } else {
      status = 'overdue';
      penaltyAmount = canonicalPenalty;
    }
  } else {
    const paymentYear = lastPaymentDate.getFullYear();
    const paymentMonth = lastPaymentDate.getMonth();

    if (paymentYear === currentYear && paymentMonth >= 1) {
      // Paid Feb..Dec of current year -> covers current Feb..Jan cycle
      status = 'active';
      daysUntilDue = Math.ceil(
        (nextPaymentDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
    } else if (paymentYear === currentYear - 1 && paymentMonth >= 1) {
      // Paid for previous cycle; we're either in grace or overdue for new one
      if (today <= gracePeriodEnd) {
        status = 'grace-period';
        daysUntilDue = Math.ceil(
          (gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
      } else {
        status = 'overdue';
        penaltyAmount = canonicalPenalty;
      }
    } else {
      status = 'expired';
      penaltyAmount = canonicalPenalty;
    }
  }

  return {
    status,
    daysUntilDue,
    penaltyAmount,
    nextPaymentDue,
    gracePeriodEnd,
  };
}
