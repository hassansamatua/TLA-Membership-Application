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

// Helper function to build WHERE clause
function buildWhereClause(type: string): string {
  switch (type) {
    case 'completed':
      return 'WHERE status = "completed"';
    case 'pending':
      return 'WHERE status = "pending"';
    case 'failed':
      return 'WHERE status = "failed"';
    default:
      return '';
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const type = searchParams.get('type') || 'all'; // 'all', 'completed', 'pending', 'failed'
    
    const connection = await pool.getConnection();

    // Build where clause for filtering
    const whereClause = buildWhereClause(type);

    // Payment metrics (from both payments AND membership_payments)
    const [metrics] = await connection.query<RowDataPacket[]>(`
      SELECT
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as avg_payment,
        COUNT(DISTINCT user_id) as paying_customers,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
        ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
      FROM ${ALL_PAYMENTS} AS all_payments
      ${whereClause}
    `);

    // Payment trends over time
    const [trends] = await connection.query<RowDataPacket[]>(`
      SELECT
        ${getDateGroup(period, 'created_at')} as period,
        COUNT(*) as payment_count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        COUNT(DISTINCT user_id) as unique_payers,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
      FROM ${ALL_PAYMENTS} AS all_payments
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      ${type !== 'all' ? `AND status = '${type}'` : ''}
      GROUP BY period
      ORDER BY period
    `);

    // Payment methods distribution
    const [paymentMethods] = await connection.query<RowDataPacket[]>(`
      SELECT
        COALESCE(payment_method, 'Unknown') as method,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        ROUND(COUNT(*) * 100.0 / NULLIF((
          SELECT COUNT(*) FROM ${ALL_PAYMENTS} AS cnt ${whereClause}
        ), 0), 2) as percentage
      FROM ${ALL_PAYMENTS} AS all_payments
      ${whereClause}
      GROUP BY payment_method
      ORDER BY count DESC
    `);

    // Revenue by membership type
    const [revenueByType] = await connection.query<RowDataPacket[]>(`
      SELECT
        COALESCE(m.membership_type, 'Unknown') as membership_type,
        COUNT(ap.id) as payment_count,
        SUM(ap.amount) as total_revenue,
        AVG(ap.amount) as avg_payment,
        COUNT(CASE WHEN ap.status = 'completed' THEN 1 END) as successful_payments
      FROM ${ALL_PAYMENTS} AS ap
      LEFT JOIN memberships m ON ap.user_id = m.user_id
      WHERE ap.status = 'completed'
      GROUP BY m.membership_type
      ORDER BY total_revenue DESC
    `);

    // Failed payments analysis
    const [failedPayments] = await connection.query<RowDataPacket[]>(`
      SELECT
        ${getDateGroup(period, 'created_at')} as period,
        COUNT(*) as failed_count,
        COUNT(DISTINCT user_id) as affected_users,
        'Payment Failed' as reason
      FROM ${ALL_PAYMENTS} AS all_payments
      WHERE status = 'failed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY period
      ORDER BY period, failed_count DESC
    `);

    // Payment frequency analysis
    const [paymentFrequency] = await connection.query<RowDataPacket[]>(`
      SELECT
        user_id,
        COUNT(*) as payment_count,
        SUM(amount) as total_spent,
        AVG(amount) as avg_payment,
        MAX(created_at) as last_payment,
        MIN(created_at) as first_payment
      FROM ${ALL_PAYMENTS} AS all_payments
      WHERE status = 'completed'
      GROUP BY user_id
      ORDER BY payment_count DESC
      LIMIT 20
    `);

    // Monthly revenue comparison
    const [monthlyComparison] = await connection.query<RowDataPacket[]>(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue,
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as avg_payment
      FROM ${ALL_PAYMENTS} AS all_payments
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `);

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        metrics: metrics[0],
        trends,
        paymentMethods,
        revenueByType,
        failedPayments,
        paymentFrequency,
        monthlyComparison
      }
    });

  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment analytics' },
      { status: 500 }
    );
  }
}
