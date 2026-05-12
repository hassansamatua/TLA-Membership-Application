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

    // Get user membership status (try different table names)
    let membershipStatus = null;
    try {
      const [membershipRows] = await connection.query(
        `SELECT * FROM user_membership_status WHERE user_id = ?`,
        [userId]
      ) as RowDataPacket[];
      membershipStatus = membershipRows[0] || null;
    } catch (err) {
      // Try alternative table name
      try {
        const [membershipRows] = await connection.query(
          `SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1`,
          [userId]
        ) as RowDataPacket[];
        membershipStatus = membershipRows[0] || null;
      } catch (err2) {
        console.log('Membership tables not found, using default status');
      }
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
      totalDue
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
