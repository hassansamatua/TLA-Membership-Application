import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { 
  calculatePaymentPlan, 
  getCurrentMembershipYear,
  MEMBERSHIP_FEE,
  PENALTY_FEE,
  getMembershipYearDates,
  getCurrentPaymentWindow,
  getMembershipStatus,
  isMembershipExpired,
  canViewMembershipId,
  calculatePenalty,
  getFirstMembershipYear
} from '@/lib/membershipPayment';
import { RowDataPacket } from 'mysql2/promise';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (authToken) return authToken;

  try {
    const cookieStore = await cookies();
    return cookieStore.get('token')?.value || null;
  } catch {
    const cookieHeader = request.headers.get('cookie');
    return cookieHeader
      ? cookieHeader
          .split('; ')
          .find(c => c.trim().startsWith('token='))
          ?.split('=')[1] || null
      : null;
  }
}

// GET - Get payment information for a user
export async function GET(request: Request) {
  const connection = await pool.getConnection();

  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user information
    const [users] = await connection.query<RowDataPacket[]>(
      `SELECT u.*, up.* 
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    const joinDate = new Date(user.created_at || user.join_date || user.createdAt);

    // Get existing payments (column is `cycle_year`, not `payment_year`)
    const [payments] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM membership_payments 
       WHERE user_id = ? 
       ORDER BY cycle_year DESC`,
      [userId]
    );

    const paidYears = (payments as any[]).map(p => p.cycle_year);

    // Calculate payment plan
    const paymentPlan = calculatePaymentPlan(
      parseInt(userId),
      joinDate,
      paidYears
    );

    // Get membership status
    const membershipStatus = getMembershipStatus(joinDate, paidYears);
    const isExpired = isMembershipExpired(joinDate, paidYears);
    const canViewId = canViewMembershipId(joinDate, paidYears);

    // Get payment window info
    const paymentWindow = getCurrentPaymentWindow();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        joinDate: user.created_at || user.join_date || user.createdAt,
        membershipType: user.membership_type,
        membershipNumber: user.membership_number,
        membershipStatus: membershipStatus.status,
        canViewMembershipId: canViewId,
        isExpired: isExpired
      },
      paymentPlan,
      paymentWindow,
      payments: payments || [],
      constants: {
        MEMBERSHIP_FEE,
        PENALTY_FEE
      }
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/payment:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// POST - Process payment
export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, selectedYears, paymentMethod, amount, transactionId } = body;

    if (!userId || !selectedYears || !selectedYears.length || !paymentMethod || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user information
    const [users] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    const joinDate = new Date(user.created_at);

    // Get existing payments (column is `cycle_year`)
    const [existingPayments] = await connection.query<RowDataPacket[]>(
      `SELECT cycle_year FROM membership_payments WHERE user_id = ?`,
      [userId]
    );

    const paidYears = (existingPayments as any[]).map(p => p.cycle_year);

    // Check for duplicate payments
    const duplicateYears = selectedYears.filter((year: number) => paidYears.includes(year));
    if (duplicateYears.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Already paid for years: ${duplicateYears.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Calculate payment plan
    const paymentPlan = calculatePaymentPlan(
      parseInt(userId),
      joinDate,
      paidYears,
      selectedYears
    );

    // Verify payment amount
    const expectedAmount = paymentPlan.dueAmount;
    if (amount !== expectedAmount) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Invalid payment amount. Expected: ${expectedAmount}, Received: ${amount}` 
        },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    try {
      // Process each year's payment
      for (const year of selectedYears) {
        const dates = getMembershipYearDates(year);
        const now = new Date();
        let penalty = 0;

        // Calculate penalty if overdue
        if (now > dates.gracePeriodEnd) {
          penalty = PENALTY_FEE;
        }

        // Insert payment record (column is `cycle_year`; `reference` is required NOT NULL)
        const reference = `ADMIN-${Date.now()}-${userId}-${year}`;
        await connection.query(
          `INSERT INTO membership_payments
            (user_id, cycle_year, amount, payment_method, reference,
             payment_date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW(), NOW())`,
          [
            userId,
            year,
            MEMBERSHIP_FEE + penalty,
            paymentMethod,
            transactionId || reference,
            now,
          ]
        );
      }

      // Update user membership status if needed
      const currentYear = getCurrentMembershipYear();
      if (selectedYears.includes(currentYear)) {
        await connection.query(
          `UPDATE users SET is_approved = 1 WHERE id = ?`,
          [userId]
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: `Payment processed successfully for ${selectedYears.length} year(s)`,
        paymentDetails: {
          userId,
          paidYears: selectedYears,
          totalAmount: amount,
          paymentMethod,
          transactionId
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error in POST /api/admin/payment:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
