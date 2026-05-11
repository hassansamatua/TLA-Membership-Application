import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sendEmail, emailTemplates } from '@/lib/email';

// Helper function to send rejection email
async function sendRejectionEmail(email: string, name: string, reason?: string) {
  try {
    const emailTemplate = emailTemplates.userRejected(name, reason);
    const success = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });
    
    if (success) {
      console.log('Rejection email sent successfully to:', email);
    } else {
      console.log('Failed to send rejection email to:', email);
    }
  } catch (emailError) {
    console.error('Error sending rejection email:', emailError);
  }
}

interface User extends RowDataPacket {
  id: number;
  is_approved: boolean;
  name: string;
  email: string;
  membership_number?: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    
    console.log('Rejecting user:', userId);
    
    // Get rejection reason from request body
    const body = await request.json().catch(() => ({}));
    const rejectionReason = body.reason || undefined;

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

    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
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

      const [result] = await connection.query<ResultSetHeader>(
        'UPDATE users SET is_approved = FALSE, updated_at = NOW() WHERE id = ?',
        [userId]
      );

      console.log('Database update result:', result);

      if (!result.affectedRows) {
        console.error('No rows affected when rejecting user:', userId);
        return NextResponse.json(
          { success: false, message: 'Failed to reject user' },
          { status: 500 }
        );
      }

      console.log('User rejected successfully:', userId);

      // Send rejection email
      try {
        console.log(`[REJECT] Attempting to send rejection email to ${user.email}`);
        await sendRejectionEmail(user.email, user.name, rejectionReason);
        console.log(`[REJECT] Rejection email sent successfully`);
      } catch (emailError) {
        console.error('[REJECT] Failed to send rejection email:', emailError);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'User rejected successfully',
        user: {
          id: user.id,
          isApproved: false,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error rejecting user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
