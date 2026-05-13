import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCycleYearForDate } from '@/lib/membershipCycles';
import { 
    getMembershipFee, 
    generateMembershipNumber, 
    getEnhancedCycleDates, 
    calculateEnhancedPenalties, 
    isUserNew, 
    getUserCategory,
    listFutureUnpaidCycles,
    ENHANCED_MEMBERSHIP_CONFIG 
} from '@/lib/enhancedMembershipCycles';
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

export async function GET(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT token directly (no database lookup needed)
    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    connection = await pool.getConnection();
    
    // Get user info directly by ID
    const [userRows] = await connection.query(
      'SELECT id, user_category FROM users WHERE id = ?',
      [decoded.id]
    ) as RowDataPacket[];

    if (userRows.length === 0) {
      // Return a default response for new users who haven't registered yet
      const now = new Date();
      const cycleYear = getCycleYearForDate(now);
      const cycleDates = getEnhancedCycleDates(cycleYear);
      
      return NextResponse.json({
        success: true,
        cycle: {
          year: cycleYear,
          startDate: cycleDates.cycleStart.toISOString().split('T')[0],
          dueDate: cycleDates.dueDate.toISOString().split('T')[0],
          expiryDate: cycleDates.cycleEnd.toISOString().split('T')[0]
        },
        membership: null,
        canAccessIdCard: false,
        userCategory: 'regular',
        baseFee: 40000,
        penaltyAmount: 0,
        totalDue: 40000,
        message: 'Please register to get full membership benefits'
      });
    }

    const userId = userRows[0].id;
    const userCategory = userRows[0].user_category as 'librarian' | 'organization' | 'regular';

    // Get current cycle year
    const now = new Date();
    const cycleYear = getCycleYearForDate(now);
    const cycleDates = getEnhancedCycleDates(cycleYear);

    // Check if user is new
    const isNewUser = await isUserNew(userId);
    
    // Get membership fee based on category and user status
    const { baseAmount } = getMembershipFee({ 
        category: userCategory, 
        isFirstYear: isNewUser,
        isNewUser 
    });

    // Calculate penalties using cycle-based logic
    const { penaltyAmount, totalDue } = calculateEnhancedPenalties({
        baseAmount,
        cycleYear,
        now,
        isNewUser,
        category: userCategory
    });

    // Read BOTH tables and merge. `memberships` is the source of truth for
    // expiry_date / membership_number / amount_paid (those columns don't even
    // exist on user_membership_status). `user_membership_status` holds the
    // cycle-aware flags. Previously this endpoint short-circuited on the
    // first table, so the dashboard widget never saw the extended expiry
    // after a multi-cycle prepay.
    let umsRow: any = null;
    let memRow: any = null;
    try {
      const [r] = await connection.query(
        `SELECT * FROM user_membership_status WHERE user_id = ?`,
        [userId]
      ) as RowDataPacket[];
      umsRow = (r as any[])[0] || null;
    } catch {
      // table missing — fine
    }
    try {
      const [r] = await connection.query(
        `SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1`,
        [userId]
      ) as RowDataPacket[];
      memRow = (r as any[])[0] || null;
    } catch {
      console.log('memberships table not found, using user_membership_status only');
    }

    // Compose a single status object preferring authoritative columns from
    // each source. The shape stays compatible with the existing response
    // mapping below.
    let membershipStatus: any = null;
    if (umsRow || memRow) {
      membershipStatus = {
        // Identity / numbering: memberships wins, ums has no such column.
        membership_number: memRow?.membership_number || null,
        // Status flags: prefer ums (cycle-aware) but fall back to memberships.
        status: umsRow?.status || memRow?.status || 'pending',
        payment_status:
          umsRow?.payment_status || memRow?.payment_status || 'pending',
        // Expiry: ALWAYS take from memberships when present — that's where
        // multi-cycle prepayments extend to. ums has no expiry column.
        expiry_date: memRow?.expiry_date || null,
        joined_date: memRow?.joined_date || memRow?.payment_date || null,
        amount_paid: memRow?.amount_paid ?? 0,
      };
    }

    // Generate membership number for new users
    if (isNewUser && !membershipStatus?.membership_number) {
      try {
        const newMembershipNumber = await generateMembershipNumber();
        
        try {
          await connection.query(
            'UPDATE user_membership_status SET membership_number = ? WHERE user_id = ?',
            [newMembershipNumber, userId]
          );
        } catch (err) {
          // Try alternative table
          await connection.query(
            'UPDATE memberships SET membership_number = ? WHERE user_id = ?',
            [newMembershipNumber, userId]
          );
        }
        
        membershipStatus = { ...membershipStatus, membership_number: newMembershipNumber };
      } catch (err) {
        console.log('Could not generate membership number');
      }
    }

    // Determine if user can access ID card based on payment status
    const canAccessIdCard = (membershipStatus?.payment_status === 'completed' || membershipStatus?.payment_status === 'paid') && membershipStatus?.status === 'active';

    // Get current cycle payment status
    let currentPaymentStatus = null;
    try {
      const [paymentRows] = await connection.query(
        `SELECT * FROM cycle_payment_status WHERE user_id = ? AND cycle_year = ?`,
        [userId, cycleYear]
      ) as RowDataPacket[];
      currentPaymentStatus = paymentRows[0] || null;
    } catch (err) {
      console.log('Cycle payment status table not found');
    }

    // Build per-cycle pricing for the checkout UI (current + up to 2 future
    // cycles). Per requirements: NO discount when prepaying — every cycle
    // is full price, with penalty applied only to the current cycle when
    // applicable. Best-effort: a failure here must not break the endpoint.
    let pricingPerCycle: Array<any> = [];
    let availableNextCycles: number[] = [];
    try {
      pricingPerCycle = await listFutureUnpaidCycles({ userId, maxFuture: 2, now });
      availableNextCycles = pricingPerCycle
        .filter((c: any) => !c.isPaid)
        .map((c: any) => c.cycleYear);
    } catch (err) {
      console.warn('[membership/status] listFutureUnpaidCycles failed:', (err as Error).message);
    }

    // Recent payments (last 10) — used by the payment page's history widget
    // so we don't need a second roundtrip. Reads from membership_payments
    // (cycle-aware) first, then falls back to the raw `payments` ledger.
    let recentPayments: any[] = [];
    try {
      const [rows] = await connection.query(
        `SELECT mp.id, mp.amount, mp.payment_method, mp.reference,
                mp.payment_date, mp.cycle_year, mp.status,
                'membership_payment' AS source
           FROM membership_payments mp
          WHERE mp.user_id = ?
          ORDER BY mp.payment_date DESC, mp.id DESC
          LIMIT 10`,
        [userId]
      ) as RowDataPacket[];
      recentPayments = rows as any[];
    } catch {
      // best-effort
    }
    if (recentPayments.length === 0) {
      try {
        const [rows] = await connection.query(
          `SELECT id, amount, payment_method, reference,
                  COALESCE(paid_at, created_at) AS payment_date,
                  cycle_year, status, 'payment' AS source
             FROM payments
            WHERE user_id = ? AND status = 'completed'
            ORDER BY COALESCE(paid_at, created_at) DESC, id DESC
            LIMIT 10`,
          [userId]
        ) as RowDataPacket[];
        recentPayments = rows as any[];
      } catch {
        // best-effort
      }
    }

    // Collect every cycle this user has actually paid for, sorted asc.
    // Sources: cycle_payment_status (preferred) ∪ membership_payments.
    // Used by the dashboard to show "Cycles paid: 2026, 2027, 2028".
    let paidCycles: number[] = [];
    try {
      const [rows] = await connection.query(
        `SELECT cycle_year FROM (
            SELECT cycle_year FROM cycle_payment_status
             WHERE user_id = ? AND is_paid = TRUE AND cycle_year IS NOT NULL
            UNION
            SELECT cycle_year FROM membership_payments
             WHERE user_id = ? AND status = 'completed' AND cycle_year IS NOT NULL
         ) u
         ORDER BY cycle_year ASC`,
        [userId, userId]
      ) as RowDataPacket[];
      paidCycles = (rows as any[]).map((r) => Number(r.cycle_year));
    } catch (err) {
      console.warn('[membership/status] paidCycles aggregation failed:', (err as Error).message);
    }

    return NextResponse.json({
      success: true,
      cycle: {
        year: cycleYear,
        startDate: cycleDates.cycleStart.toISOString().split('T')[0],
        dueDate: cycleDates.dueDate.toISOString().split('T')[0],
        expiryDate: cycleDates.cycleEnd.toISOString().split('T')[0]
      },
      membership: membershipStatus ? {
        membershipNumber: membershipStatus.membership_number,
        membershipType: userCategory,
        status: membershipStatus.status,
        paymentStatus: membershipStatus.payment_status === 'paid' ? 'completed' : membershipStatus.payment_status,
        joinedDate: membershipStatus.joined_date,
        expiryDate: membershipStatus.expiry_date,
        amountPaid: membershipStatus.amount_paid
      } : null,
      canAccessIdCard,
      userCategory,
      baseFee: baseAmount,
      penaltyAmount,
      totalDue,
      // New fields used by the redesigned checkout UI:
      pricingPerCycle,
      availableNextCycles,
      maxCycleCount: 3, // hard cap = current + 2 future (per plan)
      paidCycles, // ascending list of every cycle_year this user has paid
      recentPayments, // last 10 payments for the history widget
    });
  } catch (error) {
    console.error('Membership status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
