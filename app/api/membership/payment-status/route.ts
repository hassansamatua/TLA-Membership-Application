import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import type { RowDataPacket } from 'mysql2';

interface MembershipPayment {
  id: number;
  membership_type: string;
  status: string;
  payment_status: string;
  payment_date?: string;
  amount_paid?: number;
  expiry_date: string;
  created_at: string;
}

interface PaymentYearStatus {
  year: number;
  status: 'paid' | 'pending' | 'overdue' | 'expired';
  membership?: MembershipPayment;
  canPayForNextYear: boolean;
}

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    // Use the same authentication as other APIs
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const userId = decoded.id;

    const connection = await pool.getConnection();

    try {
      // Get all membership records for this user
      const [memberships] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM memberships WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      ) as [MembershipPayment[], any];

      // Generate payment status for each year
      const currentYear = new Date().getFullYear();
      const years: PaymentYearStatus[] = [];

      // Process existing memberships
      for (const membership of memberships) {
        const membershipYear = new Date(membership.created_at).getFullYear();
        const expiryDate = new Date(membership.expiry_date);
        const today = new Date();

        let status: 'paid' | 'pending' | 'overdue' | 'expired';

        if (membership.payment_status === 'paid') {
          if (expiryDate < today) {
            status = 'expired';
          } else {
            status = 'paid';
          }
        } else if (membership.payment_status === 'pending') {
          status = 'pending';
        } else {
          // Check if overdue (more than 30 days after creation without payment)
          const createdAt = new Date(membership.created_at);
          const thirtyDaysLater = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          if (today > thirtyDaysLater && membership.payment_status !== 'paid') {
            status = 'overdue';
          } else {
            status = 'pending';
          }
        }

        years.push({
          year: membershipYear,
          status,
          membership,
          canPayForNextYear: status === 'expired' || status === 'overdue' || membershipYear < currentYear,
        });
      }

      // Add current year if not present
      const hasCurrentYear = years.some(y => y.year === currentYear);
      if (!hasCurrentYear) {
        years.push({
          year: currentYear,
          status: 'pending',
          canPayForNextYear: false,
        });
      }

      // Add next year if user can pay for it
      const currentYearStatus = years.find(y => y.year === currentYear);
      if (currentYearStatus && (currentYearStatus.status === 'paid' || currentYearStatus.status === 'expired')) {
        const hasNextYear = years.some(y => y.year === currentYear + 1);
        if (!hasNextYear) {
          years.push({
            year: currentYear + 1,
            status: 'pending',
            canPayForNextYear: false,
          });
        }
      }

      // Sort years by most recent first
      years.sort((a, b) => b.year - a.year);

      return NextResponse.json({
        success: true,
        years,
        currentYear,
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
}
