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
    
    const connection = await pool.getConnection();

    // Get member growth data
    const [growthData] = await connection.query<RowDataPacket[]>(`
      SELECT 
        ${getDateGroup(period, 'u.created_at')} as period,
        COUNT(*) as new_members,
        COUNT(DISTINCT u.id) as unique_members
      FROM users u
      WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      GROUP BY period
      ORDER BY period
    `);

    // Get membership status distribution
    const [statusDistribution] = await connection.query<RowDataPacket[]>(`
      SELECT 
        m.status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM memberships), 2) as percentage
      FROM memberships m
      GROUP BY m.status
    `);

    // Get membership type trends
    const [typeTrends] = await connection.query<RowDataPacket[]>(`
      SELECT 
        COALESCE(m.membership_type, 'Unknown') as type,
        ${getDateGroup(period, 'm.created_at')} as period,
        COUNT(*) as count
      FROM memberships m
      WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      GROUP BY type, period
      ORDER BY period, type
    `);

    // Get member demographics
    const [demographics] = await connection.query<RowDataPacket[]>(`
      SELECT 
        u.membership_type,
        COUNT(*) as count,
        AVG(DATEDIFF(NOW(), u.created_at)) as avg_days_as_member
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id
      GROUP BY u.membership_type
    `);

    // Get member activity levels
    const [activityLevels] = await connection.query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN DATEDIFF(NOW(), u.updated_at) <= 7 THEN 'Active'
          WHEN DATEDIFF(NOW(), u.updated_at) <= 30 THEN 'Moderately Active'
          WHEN DATEDIFF(NOW(), u.updated_at) <= 90 THEN 'Less Active'
          ELSE 'Inactive'
        END as activity_level,
        COUNT(*) as count
      FROM users u
      WHERE u.updated_at IS NOT NULL
      GROUP BY activity_level
    `);

    // Get member retention data
    const [retentionData] = await connection.query<RowDataPacket[]>(`
      SELECT 
        DATE_FORMAT(m.created_at, '%Y-%m') as month,
        COUNT(*) as new_members,
        COUNT(CASE WHEN m2.user_id IS NOT NULL THEN 1 END) as retained_members,
        ROUND(COUNT(CASE WHEN m2.user_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as retention_rate
      FROM memberships m
      LEFT JOIN memberships m2 ON m.user_id = m2.user_id 
        AND m2.created_at > DATE_ADD(m.created_at, INTERVAL 1 YEAR)
      WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 2 YEAR)
      GROUP BY DATE_FORMAT(m.created_at, '%Y-%m')
      ORDER BY month
    `);

    // Get active members list
    const [activeMembersList] = await connection.query<RowDataPacket[]>(`
      SELECT 
        u.id,
        u.name,
        u.email,
        m.membership_number,
        m.membership_type,
        m.status,
        m.expiry_date,
        m.joined_date,
        m.payment_status,
        m.created_at as membership_created_at
      FROM memberships m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active' 
      AND m.expiry_date >= CURDATE()
      ORDER BY m.created_at DESC
      LIMIT 50
    `);

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        growth: growthData,
        statusDistribution,
        typeTrends,
        demographics,
        activityLevels,
        retentionData,
        activeMembersList
      }
    });

  } catch (error) {
    console.error('Error fetching membership analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership analytics' },
      { status: 500 }
    );
  }
}
