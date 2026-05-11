import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

function getCycleDates(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Dynamic cycle detection: If it's January, it's still current cycle
  const cycleYear = month >= 3 ? year : year - 1;
  const cycleStart = month >= 3 ? new Date(cycleYear, 0, 1) : new Date(cycleYear - 1, 0, 1);
  const dueDate = new Date(cycleYear, 2, 30); // March 30
  const expiryDate = new Date(cycleYear + 1, 0, 31); // December 31
  
  return {
    cycleYear,
    cycleStart,
    dueDate,
    expiryDate,
    isCurrentCycle: month >= 3 // January-February is current cycle
  };
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { amount, paymentMethod, paymentReference } = body;

    if (!amount || !paymentMethod) {
      return NextResponse.json({ success: false, message: 'Amount and payment method are required' }, { status: 400 });
    }

    connection = await pool.getConnection();

    const now = new Date();
    const cycle = getCycleDates(now);

    // Get user's current membership and payment status
    const [membershipRows] = await connection.query(
      'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1',
      [decoded.id]
    ) as any[];

    const currentMembership = membershipRows[0] || null;

    // Check if user already paid for current cycle
    const alreadyPaidForCurrentCycle = currentMembership && 
      currentMembership.payment_status === 'paid' && 
      currentMembership.membership_type === 'renewal';

    // NEW: Allow early payment for next cycle even if current cycle is paid
    const canPayForNextCycle = cycle.isCurrentCycle && alreadyPaidForCurrentCycle;

    if (!cycle.isCurrentCycle && !canPayForNextCycle) {
      return NextResponse.json({ 
        success: false, 
        message: 'Early payment only available during January-February for current cycle, or after current cycle is paid' 
      }, { status: 400 });
    }

    // Calculate amounts based on payment type
    const isRenewal = currentMembership?.membership_type === 'renewal';
    const baseAmount = isRenewal ? 30000 : 40000;

    // Get or create membership record for next cycle
    const nextCycleMembership = {
      user_id: decoded.id,
      membership_number: currentMembership?.membership_number || `TLA${cycle.cycleYear}${Math.floor(Math.random() * 90000 + 10000)}`,
      membership_type: isRenewal ? 'renewal' : 'new',
      status: 'pending',
      payment_status: 'pending',
      joined_date: cycle.cycleStart.toISOString().slice(0, 10),
      expiry_date: cycle.expiryDate.toISOString().slice(0, 10),
      amount_paid: 0,
      payment_reference: paymentReference,
      payment_method: paymentMethod,
      cycle_year: cycle.cycleYear
    };

    // Insert or update payment record
    await connection.query(
      `INSERT INTO membership_payments 
       (user_id, amount, payment_method, payment_reference, payment_date, status, cycle_year, created_at)
       VALUES (?, ?, ?, ?, ?, NOW(), 'pending', ?, NOW())`,
      [decoded.id, amount, paymentMethod, paymentReference, cycle.cycleYear]
    );

    // Update or insert membership record
    if (currentMembership) {
      await connection.query(
        'UPDATE memberships SET ? WHERE user_id = ?',
        [
          nextCycleMembership.membership_number,
          nextCycleMembership.membership_type,
          nextCycleMembership.status,
          nextCycleMembership.payment_status,
          nextCycleMembership.joined_date,
          nextCycleMembership.expiry_date,
          nextCycleMembership.amount_paid,
          nextCycleMembership.payment_reference,
          nextCycleMembership.payment_method,
          decoded.id
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO memberships 
         (user_id, membership_number, membership_type, status, payment_status, joined_date, expiry_date, amount_paid, payment_reference, payment_method, cycle_year)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          decoded.id,
          nextCycleMembership.membership_number,
          nextCycleMembership.membership_type,
          nextCycleMembership.status,
          nextCycleMembership.payment_status,
          nextCycleMembership.joined_date,
          nextCycleMembership.expiry_date,
          nextCycleMembership.amount_paid,
          nextCycleMembership.payment_reference,
          nextCycleMembership.payment_method,
          cycle.cycleYear
        ]
      );
    }

    // Update user_profiles with payment info
    await connection.query(
      'UPDATE user_profiles SET updated_at = NOW() WHERE user_id = ?',
      [decoded.id]
    );

    return NextResponse.json({
      success: true,
      message: canPayForNextCycle 
        ? 'Early payment processed for next cycle' 
        : 'Payment processed for current cycle',
      data: {
        cycle: {
          year: cycle.cycleYear,
          startDate: cycle.cycleStart.toISOString().slice(0, 10),
          dueDate: cycle.dueDate.toISOString().slice(0, 10),
          expiryDate: cycle.expiryDate.toISOString().slice(0, 10),
          isCurrentCycle: cycle.isCurrentCycle
        },
        payment: {
          amount,
          paymentMethod,
          paymentReference,
          paymentDate: now.toISOString(),
          status: 'pending',
          type: isRenewal ? 'renewal' : 'new'
        },
        membership: nextCycleMembership,
        canPayForNextCycle,
        earlyPaymentAllowed: cycle.isCurrentCycle
      }
    });

  } catch (error) {
    console.error('Error processing early payment:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
