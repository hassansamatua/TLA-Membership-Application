import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCycleYearForDate } from '@/lib/membershipCycles';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2/promise';

type MembershipRow = RowDataPacket & {
  id: number;
  user_id: number;
  membership_number: string;
  membership_type: 'personal' | 'organization';
  status: 'active' | 'expired' | 'suspended' | 'pending';
  joined_date: string;
  expiry_date: string;
  payment_status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  payment_date: string | null;
  amount_paid: string | number;
};

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

function toDateOnlyIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCycleDates(now: Date) {
  const year = now.getFullYear();
  // Membership cycles ALWAYS run from February 1 to January 31
  // Use membership cycle year calculation (Jan dates belong to previous cycle)
  const cycleYear = getCycleYearForDate(now);
  const cycleStart = new Date(cycleYear, 1, 1); // February 1st
  const dueDate = new Date(cycleYear, 2, 31); // March 31st
  const expiryDate = new Date(cycleYear + 1, 0, 31); // January 31st next year
  return {
    cycleYear,
    cycleStart,
    dueDate,
    expiryDate
  };
}

function getPlanAmounts(args: { type: 'personal' | 'organization'; newUser: boolean }) {
  if (args.type === 'organization') {
    return { baseAmount: 150000 };
  }
  return { baseAmount: args.newUser ? 40000 : 30000 };
}

// Calculate penalties based on sophisticated rules
function calculatePenalties(args: {
  baseAmount: number;
  dueDate: Date;
  now: Date;
  newUser: boolean;
  registrationDate?: Date;
}) {
  const { baseAmount, dueDate, now, newUser } = args;
  
  // NEW USERS: No penalties for new users
  if (newUser) {
    return { penaltyAmount: 0, totalDue: baseAmount, penaltyMonths: 0 };
  }
  
  // Calculate months overdue
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Grace period: Jan 1 - March 30 (no penalties)
  const gracePeriodEnd = new Date(dueDate.getFullYear(), 2, 30); // March 30
  const isAfterGracePeriod = nowDateOnly.getTime() > gracePeriodEnd.getTime();
  
  if (!isAfterGracePeriod) {
    return { penaltyAmount: 0, totalDue: baseAmount, penaltyMonths: 0 };
  }
  
  // After April 1: TSH 1,000 per month penalty (12,000 per year)
  const monthsOverdue = Math.max(0, Math.floor((nowDateOnly.getTime() - dueDateOnly.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const penaltyAmount = monthsOverdue * 1000; // TSH 1,000 per month (12,000 per year)
  
  return {
    penaltyAmount,
    totalDue: baseAmount + penaltyAmount,
    penaltyMonths: monthsOverdue
  };
}

export async function GET(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const typeParam = url.searchParams.get('type');
    const newUserParam = url.searchParams.get('newUser');

    connection = await pool.getConnection();

    const [userRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, membership_type, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!userRows?.length) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const userTypeRaw = String((userRows[0] as any).membership_type || '').toLowerCase();
    const defaultType: 'personal' | 'organization' = userTypeRaw === 'organization' ? 'organization' : 'personal';

    const type: 'personal' | 'organization' = typeParam === 'organization' ? 'organization' : 'personal';
    const now = new Date();
    const cycle = getCycleDates(now);
    
    // Get user registration date for new user grace period calculation
    const registrationDate = new Date((userRows[0] as any).created_at);

    const [membershipRows] = await connection.query<MembershipRow[]>(
      'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1',
      [decoded.id]
    );

    const membership = membershipRows?.[0] || null;
    const hasMembership = !!membership;

    // Get all completed payments from both tables without year restrictions
    const [paymentRows] = await connection.query(
      `SELECT 
        p.id, p.user_id, p.amount, p.payment_method, p.reference,
        p.status, p.paid_at as payment_date, p.created_at, p.updated_at,
        'payment' as source
       FROM payments p
       WHERE p.user_id = ? 
       AND p.status = 'completed' 
       AND (p.paid_at IS NOT NULL AND p.paid_at <= NOW())
       UNION
       SELECT 
        mp.id, mp.user_id, mp.amount, mp.payment_method, mp.reference,
        mp.status, mp.payment_date, mp.created_at, mp.updated_at,
        'membership_payment' as source
       FROM membership_payments mp
       WHERE mp.user_id = ? 
       AND mp.status = 'completed' 
       AND (mp.payment_date IS NOT NULL AND mp.payment_date <= NOW())
       ORDER BY payment_date DESC`,
      [decoded.id, decoded.id]
    ) as any[];
    
    // Check if user has any completed payments at all
    const hasAnyPayment = paymentRows.length > 0;
    const completedPayment = paymentRows?.[0] || null;

    // User is new if they have no completed payments in either table
    const newUser = newUserParam != null
      ? newUserParam === 'true' || newUserParam === '1'
      : !hasAnyPayment; // Only check payment history, not membership

    const planType = typeParam === 'personal' || typeParam === 'organization' ? type : defaultType;
    const { baseAmount } = getPlanAmounts({ type: planType, newUser });

    // Calculate penalties based on the current date
    const { penaltyAmount, totalDue, penaltyMonths } = calculatePenalties({
      baseAmount,
      dueDate: cycle.dueDate,
      now,
      newUser, // Use the newUser status we just determined
      registrationDate: registrationDate ? new Date(registrationDate) : undefined
    });

    const membershipExpiry = membership?.expiry_date ? new Date(membership.expiry_date) : null;
    const activeByDate = membershipExpiry ? membershipExpiry.getTime() >= now.getTime() : false;
    const paid = membership?.payment_status === 'paid';
    // Check if user has profile picture
    const [profileRows] = await connection.query<RowDataPacket[]>(
      'SELECT profile_picture FROM user_profiles WHERE user_id = ?',
      [decoded.id]
    );
    
    const userProfile = profileRows[0] || {};
    const hasProfilePicture = Boolean(userProfile.profile_picture && userProfile.profile_picture !== '' && userProfile.profile_picture !== null);

    // Active status depends on completed payment and membership existence
    const active = Boolean(
      membership && 
      membership.status === 'active' && 
      activeByDate && 
      hasAnyPayment
    );

    console.log('🔍 Membership Status API Response:', {
      today: now.toISOString(),
      cycle: {
        year: cycle.cycleYear,
        startDate: toDateOnlyIso(cycle.cycleStart),
        dueDate: toDateOnlyIso(cycle.dueDate),
        expiryDate: toDateOnlyIso(cycle.expiryDate)
      },
      membership: membership ? {
        expiryDate: membership.expiry_date,
        status: membership.status,
        paymentStatus: membership.payment_status
      } : null,
      active,
      activeByDate,
      hasAnyPayment
    });

    const effectiveFees = active
      ? { baseAmount: 0, penaltyAmount: 0, totalDue: 0, currency: 'TZS' }
      : { baseAmount, penaltyAmount, totalDue, currency: 'TZS' };

    return NextResponse.json({
      success: true,
      cycle: {
        year: cycle.cycleYear,
        startDate: toDateOnlyIso(cycle.cycleStart),
        dueDate: toDateOnlyIso(cycle.dueDate),
        expiryDate: toDateOnlyIso(cycle.expiryDate)
      },
      plan: {
        type: planType,
        newUser: !hasAnyPayment // User is new only if they have no payments at all
      },
      fees: effectiveFees,
      // NEW: Add penalty breakdown for transparency
      penaltyBreakdown: {
        penaltyMonths,
        monthlyPenalty: 1000,
        totalPenalty: penaltyAmount,
        gracePeriod: 'Feb 1 - Mar 30',
        penaltyPeriod: 'Apr 1 onwards'
      },
      membership: membership
        ? {
            membershipNumber: membership.membership_number,
            membershipType: membership.membership_type,
            status: membership.status,
            paymentStatus: membership.payment_status,
            joinedDate: membership.joined_date,
            expiryDate: membership.expiry_date,
            amountPaid: membership.amount_paid,
            payment_date: membership.payment_date
          }
        : null,
      payments: paymentRows, // Include all payment history
      hasCompletedPayment: hasAnyPayment, // Explicit flag for completed payments
      canAccessIdCard: hasAnyPayment
    });
  } catch (error) {
    if ((error as any)?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json(
        {
          success: false,
          message: 'Membership system is not set up yet. Please run database migrations for memberships/payments.'
        },
        { status: 500 }
      );
    }

    console.error('Error in GET /api/membership/status:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
