// app/api/admin/reports/summary/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function GET() {
  try {
    // Get database connection
    const connection = await pool.getConnection();

    // Get total members count
    const [totalMembers] = await connection.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM users
    `);

    // Get active memberships count
    const [activeMembers] = await connection.query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM memberships 
      WHERE status = 'active' 
      AND expiry_date >= CURDATE()
    `);

    // Get total revenue
    const [revenue] = await connection.query<RowDataPacket[]>(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE status = 'completed'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Get renewal rate
    const [renewalRate] = await connection.query<RowDataPacket[]>(`
      SELECT 
        ROUND((
          SELECT COUNT(DISTINCT user_id)
          FROM memberships
          WHERE status = 'active'
          AND expiry_date >= CURDATE()
          AND user_id IN (
            SELECT user_id 
            FROM memberships 
            WHERE expiry_date < CURDATE()
          )
        ) / NULLIF((
          SELECT COUNT(DISTINCT user_id)
          FROM memberships
          WHERE expiry_date < CURDATE()
        ), 0) * 100, 2) as renewal_rate
    `);

    // Get membership type distribution
    const [membershipTypes] = await connection.query<RowDataPacket[]>(`
      SELECT 
        membership_type as type,
        COUNT(*) as count
      FROM memberships
      WHERE status = 'active'
      GROUP BY membership_type
    `);

    // Get monthly signups for the last 6 months
    const [monthlySignups] = await connection.query<RowDataPacket[]>(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `);

    // Release connection
    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        totalMembers: totalMembers[0]?.count || 0,
        activeMembers: activeMembers[0]?.count || 0,
        totalRevenue: revenue[0]?.total || 0,
        renewalRate: parseFloat(renewalRate[0]?.renewal_rate || '0') || 0,
        membershipTypes: membershipTypes,
        monthlySignups: monthlySignups
      }
    });

  } catch (error) {
    console.error('Error fetching report summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}