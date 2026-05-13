import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2/promise';
import { generateMembershipNumber } from '@/lib/membership';

type MembershipRow = RowDataPacket & {
  id: number;
  user_id: number;
  membership_number: string;
  membership_type: 'individual' | 'organization' | 'student';
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
  const cycleYear = now.getMonth() >= 1 ? year : year - 1;
  const cycleStart = new Date(cycleYear, 1, 1);
  const dueDate = new Date(cycleYear, 2, 31);
  const expiryDate = new Date(cycleYear + 1, 0, 31);
  return { cycleYear, cycleStart, dueDate, expiryDate };
}

function getPlanAmounts(args: { type: 'personal' | 'organization'; newUser: boolean }) {
  if (args.type === 'organization') {
    return { baseAmount: 150000 };
  }
  return { baseAmount: args.newUser ? 40000 : 30000 };
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

    const body = await request.json().catch(() => ({}));
    const planType: 'personal' | 'organization' = body?.type === 'organization' ? 'organization' : 'personal';
    const newUser: boolean = Boolean(body?.newUser);
    const paymentMethod: string = String(body?.paymentMethod || 'manual');
    const transactionId: string | null = body?.transactionId ? String(body.transactionId) : null;

    const now = new Date();
    const cycle = getCycleDates(now);

    const dueDateOnly = new Date(cycle.dueDate.getFullYear(), cycle.dueDate.getMonth(), cycle.dueDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdue = nowDateOnly.getTime() > dueDateOnly.getTime();

    const { baseAmount } = getPlanAmounts({ type: planType, newUser });
    const penaltyAmount = overdue ? Math.round(baseAmount * 0.1) : 0;
    const totalDue = baseAmount + penaltyAmount;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [profileRows] = await connection.query<RowDataPacket[]>(
        'SELECT membership_number FROM user_profiles WHERE user_id = ? FOR UPDATE',
        [decoded.id]
      );
      const profileMembershipNumber = profileRows?.[0] ? (profileRows[0] as any).membership_number : null;

      const [existingMembershipRows] = await connection.query<MembershipRow[]>(
        'SELECT * FROM memberships WHERE user_id = ? ORDER BY expiry_date DESC LIMIT 1 FOR UPDATE',
        [decoded.id]
      );
      const existingMembership = existingMembershipRows?.[0] || null;

      if (existingMembership?.payment_status === 'paid' && existingMembership?.status === 'active') {
        const existingExpiry = existingMembership.expiry_date ? new Date(existingMembership.expiry_date) : null;
        const cycleExpiry = new Date(cycle.expiryDate.getFullYear(), cycle.expiryDate.getMonth(), cycle.expiryDate.getDate());
        const existingExpiryDateOnly = existingExpiry
          ? new Date(existingExpiry.getFullYear(), existingExpiry.getMonth(), existingExpiry.getDate())
          : null;

        if (existingExpiryDateOnly && existingExpiryDateOnly.getTime() >= cycleExpiry.getTime()) {
          await connection.rollback();
          return NextResponse.json(
            { success: false, message: 'Membership is already paid/active for the current cycle' },
            { status: 409 }
          );
        }
      }

      const membershipNumber =
        existingMembership?.membership_number ||
        profileMembershipNumber ||
        (await generateMembershipNumber());
      const membershipType: 'individual' | 'organization' = planType === 'organization' ? 'organization' : 'individual';

      const joinedDate = existingMembership?.joined_date || toDateOnlyIso(now);
      const expiryDate = toDateOnlyIso(cycle.expiryDate);

      const reference = `INV-${Date.now()}-${decoded.id}`;
      const dbMembershipType: 'personal' | 'organization' = planType;

      await connection.query(
        `INSERT INTO payments
           (reference, user_id, membership_type, amount, currency, status,
            payment_method, transaction_id, created_at, paid_at, updated_at,
            cycle_year, penalty_amount, is_new_member)
         VALUES (?, ?, ?, ?, 'TZS', 'completed', ?, ?, NOW(), NOW(), NOW(), ?, ?, ?)`,
        [
          reference,
          decoded.id,
          dbMembershipType,
          totalDue,
          paymentMethod,
          transactionId,
          cycle.cycleYear,
          penaltyAmount,
          newUser ? 1 : 0,
        ]
      );

      if (existingMembership) {
        await connection.query(
          `UPDATE memberships
           SET membership_number = ?,
               membership_type = ?,
               status = 'active',
               joined_date = ?,
               expiry_date = ?,
               payment_status = 'paid',
               payment_date = ?,
               amount_paid = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [
            membershipNumber,
            membershipType,
            joinedDate,
            expiryDate,
            toDateOnlyIso(now),
            totalDue,
            existingMembership.id
          ]
        );
      } else {
        await connection.query(
          `INSERT INTO memberships
           (user_id, membership_number, membership_type, status, joined_date, expiry_date, payment_status, payment_date, amount_paid)
           VALUES (?, ?, ?, 'active', ?, ?, 'paid', ?, ?)`,
          [
            decoded.id,
            membershipNumber,
            membershipType,
            joinedDate,
            expiryDate,
            toDateOnlyIso(now),
            totalDue
          ]
        );
      }

      await connection.query(
        `UPDATE user_profiles
         SET membership_number = COALESCE(membership_number, ?),
             membership_status = 'active',
             join_date = COALESCE(join_date, ?)
         WHERE user_id = ?`,
        [membershipNumber, joinedDate, decoded.id]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        membership: {
          membershipNumber,
          membershipType,
          status: 'active',
          paymentStatus: 'paid',
          joinedDate,
          expiryDate
        },
        fees: {
          baseAmount,
          penaltyAmount,
          totalPaid: totalDue,
          currency: 'TZS'
        }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (error) {
    const code = (error as any)?.code || (error as any)?.cause?.code;
    if (code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json(
        {
          success: false,
          message: 'Membership system is not set up yet. Please run database migrations for memberships/payments/membership_sequence.'
        },
        { status: 500 }
      );
    }

    console.error('Error in POST /api/membership/pay:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
