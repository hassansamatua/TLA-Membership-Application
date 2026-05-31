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
  let connection;
  try {
    connection = await pool.getConnection();

    /* ------------------------------------------------------------------ */
    /*  1. Paid vs Unpaid members                                         */
    /* ------------------------------------------------------------------ */
    let paidVsUnpaid: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          COUNT(CASE WHEN m.payment_status = 'paid' AND m.status = 'active' THEN 1 END) AS paid_members,
          COUNT(CASE WHEN m.payment_status != 'paid' OR m.status != 'active' THEN 1 END) AS unpaid_members,
          COUNT(*) AS total_members
        FROM memberships m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE u.email IS NOT NULL AND u.email != ''
      `);
      paidVsUnpaid = rows;
    } catch { /* table may not exist */ }

    // Paid/unpaid breakdown by membership type
    let paidByType: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          COALESCE(membership_type, 'Unknown') AS type,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS paid,
          COUNT(CASE WHEN payment_status != 'paid' THEN 1 END) AS unpaid,
          COUNT(*) AS total
        FROM memberships
        GROUP BY membership_type
      `);
      paidByType = rows;
    } catch { /* */ }

    // Monthly paid vs unpaid trend
    let paidUnpaidTrend: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS month,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS paid,
          COUNT(CASE WHEN payment_status != 'paid' THEN 1 END) AS unpaid
        FROM memberships
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
      `);
      paidUnpaidTrend = rows;
    } catch { /* */ }

    /* ------------------------------------------------------------------ */
    /*  2. Penalty tracking                                               */
    /* ------------------------------------------------------------------ */
    let penaltySummary: any = {};
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          COUNT(CASE WHEN penalty_amount > 0 THEN 1 END) AS members_with_penalty,
          COUNT(CASE WHEN penalty_amount = 0 OR penalty_amount IS NULL THEN 1 END) AS members_without_penalty,
          COALESCE(SUM(penalty_amount), 0) AS total_penalty_collected,
          COALESCE(AVG(CASE WHEN penalty_amount > 0 THEN penalty_amount END), 0) AS avg_penalty,
          COALESCE(MAX(penalty_amount), 0) AS max_penalty
        FROM memberships
      `);
      penaltySummary = rows[0] || {};
    } catch { /* */ }

    // Also try cycle_payment_status for more granular penalty data
    let penaltyByCycle: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          cycle_year,
          COUNT(CASE WHEN penalty_amount > 0 THEN 1 END) AS penalized,
          COUNT(CASE WHEN penalty_amount = 0 OR penalty_amount IS NULL THEN 1 END) AS no_penalty,
          COALESCE(SUM(penalty_amount), 0) AS total_penalty,
          COUNT(*) AS total_records
        FROM cycle_payment_status
        GROUP BY cycle_year
        ORDER BY cycle_year
      `);
      penaltyByCycle = rows;
    } catch { /* */ }

    // Top penalized members
    let topPenalized: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          u.name, u.email,
          m.membership_number, m.penalty_amount, m.membership_type,
          m.payment_status, m.status
        FROM memberships m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.penalty_amount > 0
        ORDER BY m.penalty_amount DESC
        LIMIT 20
      `);
      topPenalized = rows;
    } catch { /* */ }

    /* ------------------------------------------------------------------ */
    /*  3. Growth rate                                                     */
    /* ------------------------------------------------------------------ */
    let monthlyGrowth: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS month,
          COUNT(*) AS new_users,
          (SELECT COUNT(*) FROM users u2
           WHERE u2.created_at <= LAST_DAY(STR_TO_DATE(CONCAT(DATE_FORMAT(u.created_at, '%Y-%m'), '-01'), '%Y-%m-%d'))
          ) AS cumulative_users
        FROM users u
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
      `);
      monthlyGrowth = rows;
    } catch { /* */ }

    /* ------------------------------------------------------------------ */
    /*  4. Event reports                                                   */
    /* ------------------------------------------------------------------ */
    let eventSummary: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          e.id, e.title, e.status AS event_status, e.capacity, e.fee,
          e.start_time, e.end_time, e.location,
          COUNT(er.id) AS total_registrations,
          COUNT(CASE WHEN er.status = 'attended' THEN 1 END) AS attended,
          COUNT(CASE WHEN er.status = 'cancelled' THEN 1 END) AS cancelled,
          COUNT(CASE WHEN er.payment_status = 'paid' THEN 1 END) AS paid_registrations,
          COALESCE(SUM(CASE WHEN er.payment_status = 'paid' THEN er.payment_amount END), 0) AS registration_income,
          ROUND(COUNT(er.id) * 100.0 / NULLIF(e.capacity, 0), 1) AS fill_rate
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.event_id AND er.auto_unregistered = 0
        GROUP BY e.id
        ORDER BY total_registrations DESC
      `);
      eventSummary = rows;
    } catch { /* */ }

    // Event income from event_payments + event_payments_azampay
    let eventIncome: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          e.id, e.title,
          COALESCE(SUM(CASE WHEN ep.status = 'completed' THEN ep.amount END), 0) AS total_income,
          COUNT(CASE WHEN ep.status = 'completed' THEN 1 END) AS completed_payments
        FROM events e
        LEFT JOIN event_payments ep ON e.id = ep.event_id
        GROUP BY e.id
        ORDER BY total_income DESC
      `);
      eventIncome = rows;
    } catch { /* */ }

    // Monthly event registrations
    let eventTrend: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          DATE_FORMAT(er.registered_at, '%Y-%m') AS month,
          COUNT(*) AS registrations,
          COUNT(CASE WHEN er.payment_status = 'paid' THEN 1 END) AS paid,
          COUNT(DISTINCT er.event_id) AS events_active
        FROM event_registrations er
        WHERE er.registered_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          AND er.auto_unregistered = 0
        GROUP BY DATE_FORMAT(er.registered_at, '%Y-%m')
        ORDER BY month
      `);
      eventTrend = rows;
    } catch { /* */ }

    /* ------------------------------------------------------------------ */
    /*  5. Cards generated / printed (approximation from membership data) */
    /* ------------------------------------------------------------------ */
    let cardStats: any = {};
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          COUNT(CASE WHEN m.membership_number IS NOT NULL AND m.membership_number != ''
                      AND m.payment_status = 'paid' AND m.status = 'active' THEN 1 END) AS cards_eligible,
          COUNT(CASE WHEN m.membership_number IS NOT NULL AND m.membership_number != '' THEN 1 END) AS cards_generated,
          COUNT(*) AS total_memberships
        FROM memberships m
      `);
      cardStats = rows[0] || {};
    } catch { /* */ }

    // Cards by type
    let cardsByType: any[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          COALESCE(membership_type, 'Unknown') AS type,
          COUNT(CASE WHEN membership_number IS NOT NULL AND membership_number != ''
                      AND payment_status = 'paid' AND status = 'active' THEN 1 END) AS eligible,
          COUNT(*) AS total
        FROM memberships
        GROUP BY membership_type
      `);
      cardsByType = rows;
    } catch { /* */ }

    /* ------------------------------------------------------------------ */
    /*  6. User activity / engagement                                     */
    /* ------------------------------------------------------------------ */
    let userActivity: any = {};
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          COUNT(*) AS total_users,
          COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 1 THEN 1 END) AS active_today,
          COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 7 THEN 1 END) AS active_7d,
          COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 30 THEN 1 END) AS active_30d,
          COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 90 THEN 1 END) AS active_90d,
          COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) > 90 THEN 1 END) AS inactive,
          ROUND(COUNT(CASE WHEN DATEDIFF(NOW(), updated_at) <= 30 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS monthly_engagement_pct
        FROM users
        WHERE updated_at IS NOT NULL
      `);
      userActivity = rows[0] || {};
    } catch { /* */ }

    // Profile completion rate
    let profileCompletion: any = {};
    try {
      const [rows] = await connection.query<RowDataPacket[]>(`
        SELECT
          COUNT(*) AS total_users,
          COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) AS has_profile,
          COUNT(CASE WHEN up.profile_picture IS NOT NULL AND up.profile_picture != '' THEN 1 END) AS has_photo,
          COUNT(CASE WHEN up.phone IS NOT NULL AND up.phone != '' THEN 1 END) AS has_phone,
          ROUND(COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS profile_pct,
          ROUND(COUNT(CASE WHEN up.profile_picture IS NOT NULL AND up.profile_picture != '' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS photo_pct
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
      `);
      profileCompletion = rows[0] || {};
    } catch { /* */ }

    /* ------------------------------------------------------------------ */
    /*  7. System performance (approx from DB stats)                      */
    /* ------------------------------------------------------------------ */
    let systemPerf: any = {};
    try {
      const [tableStats] = await connection.query<RowDataPacket[]>(`
        SELECT
          (SELECT COUNT(*) FROM users) AS total_users,
          (SELECT COUNT(*) FROM memberships) AS total_memberships,
          (SELECT COUNT(*) FROM events) AS total_events,
          (SELECT COUNT(*) FROM event_registrations) AS total_event_registrations
      `);

      let totalPayments = 0;
      try {
        const [r] = await connection.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM ${ALL_PAYMENTS} AS ap`
        );
        totalPayments = r[0]?.cnt || 0;
      } catch { /* */ }

      // DB size estimate
      let dbSize: any = {};
      try {
        const [r] = await connection.query<RowDataPacket[]>(`
          SELECT
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
            SUM(TABLE_ROWS) AS total_rows
          FROM information_schema.TABLES
          WHERE table_schema = DATABASE()
        `);
        dbSize = r[0] || {};
      } catch { /* */ }

      // Table sizes
      let tableSizes: any[] = [];
      try {
        const [r] = await connection.query<RowDataPacket[]>(`
          SELECT
            table_name,
            TABLE_ROWS AS row_count,
            ROUND((data_length + index_length) / 1024, 2) AS size_kb
          FROM information_schema.TABLES
          WHERE table_schema = DATABASE()
          ORDER BY (data_length + index_length) DESC
          LIMIT 15
        `);
        tableSizes = r;
      } catch { /* */ }

      systemPerf = {
        ...tableStats[0],
        totalPayments,
        dbSizeMb: dbSize.size_mb || 0,
        totalDbRows: dbSize.total_rows || 0,
        tableSizes,
        serverTime: new Date().toISOString(),
      };
    } catch { /* */ }

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        paidVsUnpaid: paidVsUnpaid[0] || {},
        paidByType,
        paidUnpaidTrend,
        penaltySummary,
        penaltyByCycle,
        topPenalized,
        monthlyGrowth,
        eventSummary,
        eventIncome,
        eventTrend,
        cardStats,
        cardsByType,
        userActivity,
        profileCompletion,
        systemPerf,
      },
    });
  } catch (error) {
    console.error('Error fetching extended report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch extended report data' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
