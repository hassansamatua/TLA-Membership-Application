// app/api/admin/reports/summary/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

/**
 * Unified payments sub-query.
 * Pulls rows from `payments` and appends `membership_payments` rows whose
 * reference does NOT already appear in `payments` (avoids double-counting).
 */
const ALL_PAYMENTS = `(
  SELECT id, user_id, amount, status, payment_method, created_at, reference
  FROM payments
  UNION ALL
  SELECT mp.id, mp.user_id, mp.amount, mp.status, mp.payment_method, mp.created_at, mp.reference
  FROM membership_payments mp
  LEFT JOIN payments p ON p.reference = mp.reference AND p.reference IS NOT NULL AND p.reference != ''
  WHERE p.id IS NULL
)`;

export async function GET() {
  try {
    const connection = await pool.getConnection();

    // Get total members count (exclude users without email)
    const [totalMembers] = await connection.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL AND email != ''
    `);

    // Get active memberships count (exclude users without email)
    const [activeMembers] = await connection.query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT m.user_id) as count 
      FROM memberships m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active' 
      AND m.expiry_date >= CURDATE()
      AND u.email IS NOT NULL AND u.email != ''
    `);

    // Get total revenue (from both payments AND membership_payments)
    const [revenue] = await connection.query<RowDataPacket[]>(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM ${ALL_PAYMENTS} AS all_payments
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