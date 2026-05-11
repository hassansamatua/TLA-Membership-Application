// app/api/users/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sendEmail, emailTemplates } from '@/lib/email';

// Helper function to send approval email
async function sendApprovalEmail(email: string, name: string, membershipNumber?: string) {
  try {
    const emailTemplate = emailTemplates.userApproved(name, membershipNumber);
    const success = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });
    
    if (success) {
      console.log('Approval email sent successfully to:', email);
    } else {
      console.log('Failed to send approval email to:', email);
    }
  } catch (emailError) {
    console.error('Error sending approval email:', emailError);
  }
}

interface User extends RowDataPacket {
  id: number;
  is_approved: boolean;
  name: string;
  email: string;
  membership_number?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const resolvedParams = await params;
  return handleApproveUser(request, resolvedParams.id);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const resolvedParams = await params;
  return handleApproveUser(request, resolvedParams.id);
}

async function handleApproveUser(request: Request, userId: string) {
  try {
    console.log('Received request with user ID:', userId);
    console.log('User ID from params:', userId);

    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Validate user ID
    if (!userId || isNaN(Number(userId))) {
      console.error('Invalid user ID:', userId);
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      // First, check if user exists
      const [rows] = await connection.query(
        `SELECT u.id, u.is_approved, u.name, u.email, up.membership_number
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = ?`,
        [userId]
      );
      const users = rows as User[];

      if (!users || users.length === 0) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }

      const user = users[0];

      // If already approved, return success
      if (user.is_approved) {
        return NextResponse.json({
          success: true,
          message: 'User is already approved',
          user: {
            id: user.id,
            isApproved: true
          }
        });
      }

      // Generate membership number if not exists
      let membershipNumber = user.membership_number;
      if (!membershipNumber || membershipNumber.trim() === '') {
        // Import getCycleYearForDate to get correct membership cycle year
        const { getCycleYearForDate } = await import('@/lib/membershipCycles');
        const cycleYear = getCycleYearForDate(new Date()); // Uses membership cycle year (2025 until Feb 1, 2026)
        const randomNum = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
        membershipNumber = `TLA${cycleYear}${randomNum}`;
        
        console.log('Generated new membership number:', membershipNumber);
        
        // Store membership number in database
        await connection.query(
          'UPDATE user_profiles SET membership_number = ?, updated_at = NOW() WHERE user_id = ?',
          [membershipNumber, userId]
        );
      }

      // Update user approval status
      const [result] = await connection.query<ResultSetHeader>(
        'UPDATE users SET is_approved = TRUE, updated_at = NOW() WHERE id = ?',
        [userId]
      );

      // Also update membership status to 'active' in user_profiles
      await connection.query(
        'UPDATE user_profiles SET membership_status = ?, updated_at = NOW() WHERE user_id = ?',
        ['active', userId]
      );

      // Get updated user data
      const [updatedUsers] = await connection.query<User[]>(
        `SELECT u.id, u.name, u.email, u.is_approved as isApproved, up.membership_number
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = ?`,
        [userId]
      );

      // Send approval email
      await sendApprovalEmail(updatedUsers[0].email, updatedUsers[0].name, updatedUsers[0].membership_number || undefined);

      return NextResponse.json({
        success: true,
        message: 'User approved successfully',
        user: updatedUsers[0]
      });

    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, message: 'Database error' },
        { status: 500 }
      );
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error approving user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}