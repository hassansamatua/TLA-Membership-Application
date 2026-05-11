import { pool } from './db';
import type { RowDataPacket } from 'mysql2';

/**
 * MEMBERSHIP CYCLE SYSTEM
 * - Cycle: Feb 1 - Jan 31
 * - Grace Period: Feb 1 - Mar 31 (no penalties)
 * - Penalty Period: Apr 1 - Jan 31 (1000 TZS per month = 12,000 TZS per year)
 * - New users: No penalties during their first joining month
 * - Continuous users: Penalties apply after grace period for cycles after first
 */

export const MEMBERSHIP_CYCLE_CONFIG = {
  BASE_FEE: 50000, // TZS
  PENALTY_PER_MONTH: 1000, // TZS
  GRACE_PERIOD_END_MONTH: 3, // March 31 (month is 0-indexed, so 3 = April)
  GRACE_PERIOD_END_DAY: 31,
  CYCLE_START_MONTH: 1, // February
  CYCLE_START_DAY: 1,
};

/**
 * Get the membership cycle year for a given date
 * Cycle runs Feb 1 - Jan 31
 * So Jan dates are part of previous cycle, Feb+ are current cycle
 */
export function getCycleYearForDate(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  
  // If month is January (0), the cycle belongs to previous year
  if (month === 0) {
    return year - 1;
  }
  
  return year;
}

/**
 * Get cycle start and end dates
 */
export function getCycleDates(cycleYear: number) {
  return {
    startDate: new Date(cycleYear, 1, 1), // Feb 1
    endDate: new Date(cycleYear + 1, 0, 31), // Jan 31 next year
    graceperiodEndDate: new Date(cycleYear, 3, 1), // Apr 1
    penaltyStartDate: new Date(cycleYear, 3, 1), // Apr 1
  };
}

/**
 * Check if user is in grace period for a cycle
 */
export function isInGracePeriod(date: Date = new Date(), cycleYear: number): boolean {
  const { startDate, graceperiodEndDate } = getCycleDates(cycleYear);
  return date >= startDate && date < graceperiodEndDate;
}

/**
 * Calculate months passed since cycle start (for penalty calculation)
 */
export function getMonthsSinceCycleStart(date: Date = new Date(), cycleYear: number): number {
  const { startDate, penaltyStartDate } = getCycleDates(cycleYear);
  
  // If before penalty start, return 0 (grace period)
  if (date < penaltyStartDate) {
    return 0;
  }
  
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Calculate months from cycle start
  if (year === cycleYear + 1) {
    // Next year (Jan, Feb etc of cycle year+1)
    return month + 1 + 11; // +11 because we're in next year
  } else {
    // Same year as cycle (Feb onwards)
    return month - 1; // Feb=1, Mar=2, Apr=3, etc.
  }
}

/**
 * Calculate penalty for a cycle
 * Returns 0 if in grace period
 * Returns months_passed * 1000 after Apr 1
 */
export function calculatePenalty(
  paymentDate: Date,
  cycleYear: number,
  isPreviouslyContinuous: boolean
): number {
  // New users don't pay penalties
  if (!isPreviouslyContinuous) {
    return 0;
  }
  
  // If in grace period, no penalty
  if (isInGracePeriod(paymentDate, cycleYear)) {
    return 0;
  }
  
  // Calculate penalty: 1000 per month from Apr 1
  const monthsPassed = getMonthsSinceCycleStart(paymentDate, cycleYear);
  return Math.max(0, monthsPassed * MEMBERSHIP_CYCLE_CONFIG.PENALTY_PER_MONTH);
}

/**
 * Get all unpaid cycles for a user
 */
export async function getUnpaidCycles(userId: number): Promise<any[]> {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.query(
      `SELECT cps.*, mc.base_fee, mc.penalty_per_month, mc.grace_period_end
       FROM cycle_payment_status cps
       JOIN membership_cycles mc ON cps.cycle_year = mc.cycle_year
       WHERE cps.user_id = ? AND cps.is_paid = FALSE
       ORDER BY cps.cycle_year ASC`,
      [userId]
    ) as [RowDataPacket[], any];
    
    return rows;
  } finally {
    connection.release();
  }
}

/**
 * Initialize membership cycles for a new user
 */
export async function initializeUserCycles(
  userId: number,
  joinDate: Date = new Date(),
  membershipType: string = 'personal'
): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const currentCycle = getCycleYearForDate(joinDate);
    
    // Create user_membership_status record
    await connection.query(
      `INSERT IGNORE INTO user_membership_status 
       (user_id, is_new_member, first_membership_cycle, current_cycle_year, status)
       VALUES (?, TRUE, ?, ?, 'active')`,
      [userId, currentCycle, currentCycle]
    );
    
    // Create cycle_payment_status for current and next cycle
    for (let i = 0; i < 2; i++) {
      const cycleYear = currentCycle + i;
      await connection.query(
        `INSERT IGNORE INTO cycle_payment_status 
         (user_id, cycle_year, is_paid, status)
         VALUES (?, ?, FALSE, 'unpaid')`,
        [userId, cycleYear]
      );
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Record payment for a cycle
 */
export async function recordCyclePayment(
  userId: number,
  cycleYear: number,
  amount: number,
  penaltyAmount: number,
  paymentReference: string,
  paymentDate: Date = new Date()
): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    await connection.query(
      `INSERT INTO cycle_payment_status 
       (user_id, cycle_year, is_paid, payment_date, amount_paid, penalty_amount, total_amount, payment_reference, status)
       VALUES (?, ?, TRUE, ?, ?, ?, ?, ?, 'paid')
       ON DUPLICATE KEY UPDATE
         is_paid = TRUE,
         payment_date = ?,
         amount_paid = ?,
         penalty_amount = ?,
         total_amount = ?,
         payment_reference = ?,
         status = 'paid',
         updated_at = NOW()`,
      [
        userId,
        cycleYear,
        paymentDate,
        MEMBERSHIP_CYCLE_CONFIG.BASE_FEE,
        penaltyAmount,
        amount,
        paymentReference,
        paymentDate,
        MEMBERSHIP_CYCLE_CONFIG.BASE_FEE,
        penaltyAmount,
        amount,
        paymentReference,
      ]
    );
  } finally {
    connection.release();
  }
}

/**
 * Get current payment status for a user
 */
export async function getUserPaymentStatus(userId: number) {
  const connection = await pool.getConnection();
  
  try {
    const [status] = await connection.query(
      `SELECT * FROM user_membership_status WHERE user_id = ?`,
      [userId]
    ) as [RowDataPacket[], any];
    
    if (status.length === 0) {
      return null;
    }
    
    // Get cycle payment details
    const [cycles] = await connection.query(
      `SELECT * FROM cycle_payment_status WHERE user_id = ? ORDER BY cycle_year DESC`,
      [userId]
    ) as [RowDataPacket[], any];
    
    return {
      userStatus: status[0],
      cycles: cycles,
    };
  } finally {
    connection.release();
  }
}

/**
 * Calculate total amount due (all unpaid cycles with penalties)
 */
export async function calculateTotalAmountDue(userId: number): Promise<{
  totalAmount: number;
  breakdown: Array<{
    cycleYear: number;
    baseFee: number;
    penaltyAmount: number;
    total: number;
  }>;
}> {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.query(
      `SELECT cps.cycle_year, mc.base_fee
       FROM cycle_payment_status cps
       JOIN membership_cycles mc ON cps.cycle_year = mc.cycle_year
       WHERE cps.user_id = ? AND cps.is_paid = FALSE
       ORDER BY cps.cycle_year ASC`,
      [userId]
    ) as [RowDataPacket[], any];
    
    const breakdown = rows.map((row: any) => {
      const penalty = calculatePenalty(
        new Date(),
        row.cycle_year,
        true // Assuming continuous user for now
      );
      
      return {
        cycleYear: row.cycle_year,
        baseFee: row.base_fee,
        penaltyAmount: penalty,
        total: row.base_fee + penalty,
      };
    });
    
    const totalAmount = breakdown.reduce((sum, item) => sum + item.total, 0);
    
    return { totalAmount, breakdown };
  } finally {
    connection.release();
  }
}

/**
 * Check if user can pay early (for next cycle before current ends)
 */
export function canPayEarlyForNextCycle(currentDate: Date = new Date()): boolean {
  // Allow early payment from Oct 1 onwards (4 months before cycle end Jan 31)
  return currentDate.getMonth() >= 9; // October is month 9
}

/**
 * Update user membership status
 */
export async function updateUserMembershipStatus(
  userId: number,
  status: 'active' | 'inactive' | 'suspended' | 'expired',
  paymentStatus: 'paid' | 'grace_period' | 'overdue' | 'pending'
): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    await connection.query(
      `UPDATE user_membership_status 
       SET status = ?, payment_status = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [status, paymentStatus, userId]
    );
  } finally {
    connection.release();
  }
}

/**
 * Mark user as continuous (no longer new)
 */
export async function markUserAsContinuous(userId: number): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    await connection.query(
      `UPDATE user_membership_status 
       SET is_new_member = FALSE
       WHERE user_id = ?`,
      [userId]
    );
  } finally {
    connection.release();
  }
}
