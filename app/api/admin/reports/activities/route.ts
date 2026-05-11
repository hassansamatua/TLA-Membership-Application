import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

// Helper function to generate SQL date grouping
function getDateGroup(period: string, column: string): string {
  switch (period) {
    case 'daily':
      return `DATE(${column})`;
    case 'weekly':
      return `DATE_FORMAT(${column}, '%x-Wk%v')`;
    case 'monthly':
      return `DATE_FORMAT(${column}, '%Y-%m')`;
    case 'yearly':
      return `YEAR(${column})`;
    default:
      return `DATE_FORMAT(${column}, '%Y-%m')`;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const activityType = searchParams.get('type') || 'all'; // 'all', 'login', 'payment', 'membership', 'profile'
    
    const connection = await pool.getConnection();

    // User login activity
    const [loginActivity] = await connection.query<RowDataPacket[]>(`
      SELECT
        ${getDateGroup(period, 'updated_at')} as period,
        COUNT(*) as login_count,
        COUNT(DISTINCT id) as unique_users,
        COUNT(CASE WHEN DATEDIFF(updated_at, created_at) = 0 THEN 1 END) as new_user_logins
      FROM users
      WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      GROUP BY period
      ORDER BY period
    `);

    // Daily active users
    const [dailyActiveUsers] = await connection.query<RowDataPacket[]>(`
      SELECT
        DATE(updated_at) as date,
        COUNT(DISTINCT id) as daily_active_users
      FROM users
      WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(updated_at)
      ORDER BY date
    `);

    // Weekly active users
    const [weeklyActiveUsers] = await connection.query<RowDataPacket[]>(`
      SELECT
        DATE_FORMAT(updated_at, '%x-Wk%v') as week,
        COUNT(DISTINCT id) as weekly_active_users
      FROM users
      WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
      GROUP BY DATE_FORMAT(updated_at, '%x-Wk%v')
      ORDER BY week
    `);

    // Membership activity
    const [membershipActivity] = await connection.query<RowDataPacket[]>(`
      SELECT
        ${getDateGroup(period, 'm.created_at')} as period,
        COUNT(*) as new_memberships,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activated_memberships,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_memberships,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_memberships
      FROM memberships m
      WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      GROUP BY period
      ORDER BY period
    `);

    // Profile activity
    const [profileActivity] = await connection.query<RowDataPacket[]>(`
      SELECT
        ${getDateGroup(period, 'updated_at')} as period,
        COUNT(*) as profile_updates,
        COUNT(DISTINCT id) as users_updating,
        AVG(CASE WHEN updated_at > created_at THEN DATEDIFF(updated_at, created_at) ELSE 0 END) as avg_days_to_update
      FROM users
      WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      GROUP BY period
      ORDER BY period
    `);

    // Payment activity patterns
    const [paymentPatterns] = await connection.query<RowDataPacket[]>(`
      SELECT
        HOUR(created_at) as hour_of_day,
        DAYOFWEEK(created_at) as day_of_week,
        COUNT(*) as payment_count,
        SUM(amount) as total_amount
      FROM payments
      WHERE status = 'completed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
      GROUP BY HOUR(created_at), DAYOFWEEK(created_at)
      ORDER BY payment_count DESC
    `);

    // User engagement metrics
    const [engagementMetrics] = await connection.query<RowDataPacket[]>(`
      SELECT
        COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 7 THEN 1 END) as weekly_active_users,
        COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 30 THEN 1 END) as monthly_active_users,
        COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 90 THEN 1 END) as quarterly_active_users,
        COUNT(*) as total_users,
        ROUND(COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 7 THEN 1 END) * 100.0 / COUNT(*), 2) as weekly_engagement_rate,
        ROUND(COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 30 THEN 1 END) * 100.0 / COUNT(*), 2) as monthly_engagement_rate
      FROM users
      WHERE updated_at IS NOT NULL
    `);

    // Feature usage statistics
    const [featureUsage] = await connection.query<RowDataPacket[]>(`
      SELECT
        'membership_renewals' as feature,
        COUNT(*) as usage_count,
        AVG(amount) as avg_amount
      FROM payments p
      WHERE p.status = 'completed'
        AND p.user_id IN (
          SELECT DISTINCT user_id 
          FROM memberships 
          WHERE status = 'active'
        )
      
      UNION ALL
      
      SELECT
        'profile_completions' as feature,
        COUNT(*) as usage_count,
        0 as avg_amount
      FROM users
      WHERE phone_number IS NOT NULL
        AND membership_type IS NOT NULL
      
      UNION ALL
      
      SELECT
        'new_memberships' as feature,
        COUNT(*) as usage_count,
        0 as avg_amount
      FROM memberships
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Activity heat map data
    const [activityHeatmap] = await connection.query<RowDataPacket[]>(`
      SELECT
        DATE(updated_at) as date,
        DAYOFWEEK(updated_at) as day_of_week,
        COUNT(DISTINCT id) as active_users
      FROM users
      WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
      GROUP BY DATE(updated_at), DAYOFWEEK(updated_at)
      ORDER BY date
    `);

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        loginActivity,
        dailyActiveUsers,
        weeklyActiveUsers,
        membershipActivity,
        profileActivity,
        paymentPatterns,
        engagementMetrics: engagementMetrics[0],
        featureUsage,
        activityHeatmap
      }
    });

  } catch (error) {
    console.error('Error fetching activity analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity analytics' },
      { status: 500 }
    );
  }
}
