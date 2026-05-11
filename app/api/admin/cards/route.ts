import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2/promise';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

interface MembershipCardRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  email: string;
  membership_number: string;
  membership_type: string;
  membership_status: string;
  join_date: string;
  profile_picture: string | null;
  expiry_date: string;
  payment_status: string;
  amount: number;
  created_at: string;
}

export async function GET(request: Request) {
  let connection;
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    connection = await pool.getConnection();

    // Fetch all membership cards with payment information - exclude admin users
    const [results] = await connection.query<MembershipCardRow[]>(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        up.membership_number,
        up.membership_type,
        up.membership_status,
        up.join_date,
        up.profile_picture as profile_picture,
        up.phone as user_phone,
        m.expiry_date,
        m.payment_status,
        m.amount_paid,
        m.payment_date as membership_payment_date,
        m.status as membership_status_from_db,
        m.joined_date as membership_joined_date
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN memberships m ON u.id = m.user_id
      WHERE up.membership_number IS NOT NULL AND u.is_admin = 0
      ORDER BY u.created_at DESC
    `);

    // Transform data to match exactly what user membership API returns
    const transformedData = results
      .filter((row: any) => row.membership_number) // Only include users with membership numbers
      .map((row: any) => {
        // Use the same logic as user membership status API
        const membershipExpiry = row.expiry_date ? new Date(row.expiry_date) : null;
        const now = new Date();
        const activeByDate = membershipExpiry ? membershipExpiry.getTime() >= now.getTime() : false;
        const paid = row.payment_status === 'paid';
        
        // Active status depends on completed payment and membership existence - same as user API
        const active = Boolean(
          row.membership_status_from_db === 'active' && 
          activeByDate && 
          paid
        );
        
        // Universal date handling for all users
        let finalJoinDate = row.membership_joined_date && row.membership_joined_date !== '0000-00-00' && row.membership_joined_date !== null ? 
          (typeof row.membership_joined_date === 'object' ? row.membership_joined_date.toString().split('T')[0] : row.membership_joined_date) : 
          (row.join_date && row.join_date !== '0000-00-00' && row.join_date !== null ? 
            (typeof row.join_date === 'object' ? row.join_date.toString().split('T')[0] : row.join_date) : 
            null);
        
        let finalExpiryDate = row.expiry_date && row.expiry_date !== '0000-00-00' && row.expiry_date !== null ? 
          (typeof row.expiry_date === 'object' ? row.expiry_date.toString().split('T')[0] : row.expiry_date) : 
          null;
        
        let finalPaymentDate = row.membership_payment_date && row.membership_payment_date !== '0000-00-00' && row.membership_payment_date !== null ? 
          (typeof row.membership_payment_date === 'object' ? row.membership_payment_date.toString().split('T')[0] : row.membership_payment_date) : 
          null;
        
        // Universal fix: If user has paid but no dates, use payment records to create dates
        if (paid && (!finalJoinDate || !finalExpiryDate || !finalPaymentDate)) {
          // Get payment date from payments table for this user
          const paymentDate = row.membership_payment_date || row.created_at || new Date().toISOString().split('T')[0];
          const paymentDateTime = new Date(paymentDate);
          
          // Calculate proper dates based on payment date
          const joinDate = paymentDateTime.toISOString().split('T')[0];
          
          // Calculate expiry date based on membership cycle (Feb 1 - Jan 31)
          // Always use the current year for the cycle, regardless of when payment is made
          const currentYear = new Date().getFullYear();
          const expiryDate = `${currentYear}-01-31`;
          
          // Set missing dates
          if (!finalJoinDate) finalJoinDate = joinDate;
          if (!finalExpiryDate) finalExpiryDate = expiryDate;
          if (!finalPaymentDate) finalPaymentDate = joinDate;
        }
        
        // Use same field names as user membership API
        return {
          id: row.user_id.toString(),
          userId: row.user_id,
          userName: row.name,
          userEmail: row.email,
          userPhone: row.user_phone || '', // Include phone number from user_profiles
          membershipNumber: row.membership_number,
          membershipType: row.membership_type || 'personal',
          joinDate: finalJoinDate,
          expiryDate: finalExpiryDate,
          paymentStatus: row.payment_status || 'pending',
          membershipStatus: active ? 'active' : (activeByDate ? 'inactive' : 'expired'),
          amount: row.amount_paid || 0,
          paymentDate: finalPaymentDate,
          lastPaymentAmount: row.amount_paid || 0,
          profilePicture: row.profile_picture || null,
          // Additional fields to match user API structure
          status: active ? 'active' : (activeByDate ? 'inactive' : 'expired'),
          amountPaid: row.amount_paid || 0,
          payment_date: finalPaymentDate,
          joinedDate: finalJoinDate,
        };
      });
    
    console.log('📊 Admin Cards API Response:', {
      totalUsers: transformedData.length,
      sampleData: transformedData.slice(0, 2).map(card => ({
        id: card.id,
        userName: card.userName,
        membershipNumber: card.membershipNumber,
        membershipStatus: card.membershipStatus,
        paymentStatus: card.paymentStatus,
        expiryDate: card.expiryDate,
        expiryDateType: typeof card.expiryDate,
        formattedExpiry: card.expiryDate ? new Date(card.expiryDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'N/A',
        // Show the raw database value for debugging
        debugInfo: {
          expiryDateValue: card.expiryDate,
          expiryDateIsString: typeof card.expiryDate === 'string',
          expiryDateIsValid: card.expiryDate ? !isNaN(new Date(card.expiryDate).getTime()) : false
        }
      }))
    });

    return NextResponse.json({
      success: true,
      data: transformedData,
      cache: 'busted-' + Date.now(), // Force cache refresh
    });

  } catch (error) {
    console.error('Failed to fetch membership cards:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch membership cards',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
