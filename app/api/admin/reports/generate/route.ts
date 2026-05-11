import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({} as any));
    const { reportType, startDate, endDate, columns } = body;
    
    console.log('Report generation request:', { reportType, startDate, endDate, columns });
    
    if (!reportType) {
      return NextResponse.json(
        { message: 'Report type is required' },
        { status: 400 }
      );
    }

    // Handle empty dates by setting a reasonable default range
    let effectiveStartDate = startDate;
    let effectiveEndDate = endDate;
    
    if (!startDate || !endDate) {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      effectiveStartDate = oneYearAgo.toISOString().split('T')[0];
      effectiveEndDate = now.toISOString().split('T')[0];
    }
    
    let query = '';
    let params: any[] = [];

    switch (reportType) {
      case 'users':
        // Users report: name, email, registrationDate, membershipType, status
        query = `
          SELECT 
            u.name,
            u.email,
            u.created_at as registrationDate,
            COALESCE(up.membership_type, 'Not Set') as membershipType,
            COALESCE(up.membership_status, 'Inactive') as status
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id
          WHERE u.created_at BETWEEN ? AND ?
          ORDER BY u.created_at DESC
        `;
        params = [effectiveStartDate, effectiveEndDate];
        break;

      case 'activity':
        // Activity report: logins, pageViews, actions, duration, lastActive
        query = `
          SELECT 
            u.name,
            u.email,
            COUNT(DISTINCT DATE(al.created_at)) as logins,
            COUNT(al.id) as pageViews,
            SUM(CASE WHEN al.action_type IS NOT NULL THEN 1 ELSE 0 END) as actions,
            ROUND(AVG(CASE WHEN al.session_duration > 0 THEN al.session_duration ELSE 0 END), 2) as duration,
            MAX(al.created_at) as lastActive
          FROM users u
          LEFT JOIN activity_logs al ON u.id = al.user_id AND al.created_at BETWEEN ? AND ?
          GROUP BY u.id, u.name, u.email
          ORDER BY lastActive DESC
        `;
        params = [effectiveStartDate, effectiveEndDate];
        break;

      case 'membership':
        // Membership report: type, status, joinDate, expiryDate, payments
        query = `
          SELECT 
            COALESCE(up.membership_type, 'Personal') as type,
            COALESCE(up.membership_status, 'Inactive') as status,
            up.join_date as joinDate,
            m.expiry_date as expiryDate,
            COUNT(p.id) as payments
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id
          LEFT JOIN memberships m ON u.id = m.user_id
          LEFT JOIN payments p ON u.id = p.user_id AND p.created_at BETWEEN ? AND ?
          WHERE u.created_at BETWEEN ? AND ?
          GROUP BY u.id, up.membership_type, up.membership_status, up.join_date, m.expiry_date
          ORDER BY up.join_date DESC
        `;
        params = [effectiveStartDate, effectiveEndDate, effectiveStartDate, effectiveEndDate];
        break;

      case 'payments':
      case 'financial':
        // Payments report: amount, status, paymentDate, membershipType, method
        query = `
          SELECT 
            p.amount,
            p.status,
            p.created_at as paymentDate,
            COALESCE(up.membership_type, 'Personal') as membershipType,
            COALESCE(p.payment_method, 'Unknown') as method
          FROM payments p
          LEFT JOIN users u ON p.user_id = u.id
          LEFT JOIN user_profiles up ON u.id = up.user_id
          WHERE p.created_at BETWEEN ? AND ?
          ORDER BY p.created_at DESC
        `;
        params = [effectiveStartDate, effectiveEndDate];
        break;

      case 'events':
        // Events report: title, date, attendees, status, location
        query = `
          SELECT 
            e.title,
            e.start_time as date,
            COALESCE(COUNT(er.id), 0) as attendees,
            e.status,
            e.location
          FROM events e
          LEFT JOIN event_registrations er ON e.id = er.event_id
          WHERE e.created_at BETWEEN ? AND ?
          GROUP BY e.id, e.title, e.start_time, e.status, e.location
          ORDER BY e.start_time DESC
        `;
        params = [effectiveStartDate, effectiveEndDate];
        break;

      default:
        return NextResponse.json(
          { message: 'Invalid report type' },
          { status: 400 }
        );
    }

    connection = await pool.getConnection();
    console.log('Executing query:', query);
    console.log('With params:', params);
    
    const [results] = await connection.query<RowDataPacket[]>(query, params);
    console.log('Query results:', results.length, 'rows');
    
    return NextResponse.json({
      success: true,
      message: 'Report generated successfully',
      data: results,
      generatedAt: new Date().toISOString(),
      reportType,
      dateRange: { startDate, endDate },
      recordCount: results.length
    });

  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to generate report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
