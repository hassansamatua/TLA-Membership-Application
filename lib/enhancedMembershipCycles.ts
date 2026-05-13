import { pool } from './db';
import type { RowDataPacket } from 'mysql2';

/**
 * ENHANCED MEMBERSHIP CYCLE SYSTEM
 * Based on user requirements:
 * - Librarian: 40,000 TZS/year (first time), then 30,000 TZS/year
 * - Organization: 50,000 TZS/year
 * - Regular: 40,000 TZS/year (first time), then 30,000 TZS/year
 * - Cycle: Feb 1 - Jan 31
 * - Due date: Jan 31 (last day for current payment)
 * - Penalty start: April 1 (1000 TZS/month = 12,000 TZS/year)
 * - New users: No penalties first year
 */

export const ENHANCED_MEMBERSHIP_CONFIG = {
  LIBRARIAN_FIRST_YEAR: 40000,
  LIBRARIAN_RENEWAL: 30000,
  ORGANIZATION_FEE: 50000,
  REGULAR_FIRST_YEAR: 40000,
  REGULAR_RENEWAL: 30000,
  PENALTY_PER_MONTH: 1000, // TZS 1,000 per month (12,000 TZS per year)
  GRACE_PERIOD_END_MONTH: 3, // March 31 (grace period ends March 31)
  GRACE_PERIOD_END_DAY: 31,
  CYCLE_START_MONTH: 1, // February
  CYCLE_START_DAY: 1,
  DUE_DATE_MONTH: 1, // January
  DUE_DATE_DAY: 31, // January 31
  PENALTY_START_MONTH: 4, // April 1
};

/**
 * Get membership fee based on category and user status
 */
export function getMembershipFee(args: { 
    category: 'librarian' | 'organization' | 'regular'; 
    isFirstYear: boolean;
    isNewUser: boolean;
}): { baseAmount: number; isFirstYear: boolean } {
    const { category, isFirstYear, isNewUser } = args;
    
    // New users always pay first-year rates
    if (isNewUser) {
        switch (category) {
            case 'librarian':
                return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.LIBRARIAN_FIRST_YEAR, isFirstYear: true };
            case 'organization':
                return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.ORGANIZATION_FEE, isFirstYear: true };
            case 'regular':
                return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.REGULAR_FIRST_YEAR, isFirstYear: true };
            default:
                return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.REGULAR_FIRST_YEAR, isFirstYear: true };
        }
    }
    
    // Returning users pay renewal rates
    switch (category) {
        case 'librarian':
            return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.LIBRARIAN_RENEWAL, isFirstYear: false };
        case 'organization':
            return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.ORGANIZATION_FEE, isFirstYear: false };
        case 'regular':
            return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.REGULAR_RENEWAL, isFirstYear: false };
        default:
            return { baseAmount: ENHANCED_MEMBERSHIP_CONFIG.REGULAR_RENEWAL, isFirstYear: false };
    }
}

/**
 * Generate membership number in TLAYYXXXXX format
 */
export async function generateMembershipNumber(year: number = new Date().getFullYear()): Promise<string> {
    const connection = await pool.getConnection();
    
    try {
        const yearPrefix = year.toString().slice(-2); // Get last 2 digits
        
        // Try to get next sequence number for this year
        try {
            const [rows] = await connection.query(
                `SELECT MAX(sequence_number) as max_seq FROM membership_number_sequence 
                 WHERE year_prefix = ? AND is_used = FALSE`,
                [yearPrefix]
            ) as RowDataPacket[];
            
            let nextSequence = 1;
            if (rows.length > 0 && rows[0].max_seq) {
                nextSequence = rows[0].max_seq + 1;
            }
            
            // Mark this sequence as used
            await connection.query(
                `INSERT INTO membership_number_sequence (year_prefix, sequence_number, is_used) 
                 VALUES (?, ?, TRUE)`,
                [yearPrefix, nextSequence]
            );
            
            // Generate 5-digit random number
            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
            
            return `TLA${yearPrefix}${randomDigits}`;
        } catch (err) {
            // If membership_number_sequence table doesn't exist, generate a simple number
            console.log('Membership number sequence table not found, generating simple number');
            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
            return `TLA${yearPrefix}${randomDigits}`;
        }
    } finally {
        connection.release();
    }
}

/**
 * Get cycle dates for enhanced system based on cycle year
 */
export function getEnhancedCycleDates(cycleYear: number) {
    return {
        cycleYear,
        cycleStart: new Date(Date.UTC(cycleYear, 1, 1)), // February 1st UTC
        dueDate: new Date(Date.UTC(cycleYear + 1, 0, 31)), // January 31st UTC
        gracePeriodEnd: new Date(Date.UTC(cycleYear, 2, 31)), // March 31st UTC
        penaltyStartDate: new Date(Date.UTC(cycleYear, 3, 1)), // April 1st UTC
        cycleEnd: new Date(Date.UTC(cycleYear + 1, 0, 31)) // January 31st UTC
    };
}

/**
 * Calculate enhanced penalties based on user requirements and cycle dates
 */
export function calculateEnhancedPenalties(args: {
    baseAmount: number;
    cycleYear: number;
    now: Date;
    isNewUser: boolean;
    category: 'librarian' | 'organization' | 'regular';
}) {
    const { baseAmount, cycleYear, now, isNewUser, category } = args;
    
    // NEW USERS: No penalties for first year
    if (isNewUser) {
        return { penaltyAmount: 0, totalDue: baseAmount, penaltyMonths: 0 };
    }
    
    // Get cycle dates for proper calculation
    const cycleDates = getEnhancedCycleDates(cycleYear);
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Grace period: Feb 1 - March 31 (no penalties)
    const isAfterGracePeriod = nowDateOnly.getTime() > cycleDates.gracePeriodEnd.getTime();
    
    if (!isAfterGracePeriod) {
        return { penaltyAmount: 0, totalDue: baseAmount, penaltyMonths: 0 };
    }
    
    // After April 1: Count *whole calendar months elapsed* since Apr 1.
    // Apr 1 .. Apr 30  => 1 month
    // May 1 .. May 31  => 2 months
    // ...
    const penaltyStart = cycleDates.penaltyStartDate;
    const monthsOverdue = Math.max(
      0,
      (nowDateOnly.getFullYear() - penaltyStart.getUTCFullYear()) * 12 +
        (nowDateOnly.getMonth() - penaltyStart.getUTCMonth()) +
        1
    );
    const penaltyAmount = monthsOverdue * ENHANCED_MEMBERSHIP_CONFIG.PENALTY_PER_MONTH;
    
    return {
        penaltyAmount,
        totalDue: baseAmount + penaltyAmount,
        penaltyMonths: monthsOverdue
    };
}

/**
 * Check if user is new (no previous payments)
 */
export async function isUserNew(userId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
        // Try to check cycle_payment_status table first
        try {
            const [rows] = await connection.query(
                `SELECT COUNT(*) as payment_count FROM cycle_payment_status 
                 WHERE user_id = ? AND is_paid = TRUE`,
                [userId]
            ) as RowDataPacket[];
            
            return rows[0].payment_count === 0;
        } catch (err) {
            // If cycle_payment_status doesn't exist, try alternative tables
            try {
                const [rows] = await connection.query(
                    `SELECT COUNT(*) as payment_count FROM payments 
                     WHERE user_id = ? AND status = 'completed'`,
                    [userId]
                ) as RowDataPacket[];
                
                return rows[0].payment_count === 0;
            } catch (err2) {
                // If no payment tables exist, assume user is new
                console.log('No payment tables found, assuming user is new');
                return true;
            }
        }
    } finally {
        connection.release();
    }
}

/**
 * Format a Date as `YYYY-MM-DD` for MySQL DATE columns (UTC-safe).
 */
export function toMySqlDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute the canonical expiry date for a given cycle: Jan 31 of cycle+1.
 * This is what the `memberships.expiry_date` column should always be set to
 * after a successful payment — never `payment_date + 1 year`.
 */
export function getCycleExpiryDateString(cycleYear: number): string {
  return toMySqlDate(getEnhancedCycleDates(cycleYear).cycleEnd);
}

/**
 * Idempotent upsert of cycle / user membership status after a successful
 * payment. Best-effort: silently ignores missing tables in dev DBs.
 *
 * Callers should already have written to `payments` / `memberships` — this
 * function only mirrors that into the cycle-aware tables that
 * `/api/membership/status` reads from.
 */
export async function recordCycleAndUserStatus(args: {
  connection: any;
  userId: number;
  cycleYear: number;
  baseAmount: number;
  penaltyAmount: number;
  paymentReference?: string | null;
  paymentDate?: Date;
}): Promise<void> {
  const {
    connection,
    userId,
    cycleYear,
    baseAmount,
    penaltyAmount,
    paymentReference,
    paymentDate = new Date(),
  } = args;

  const totalAmount = baseAmount + penaltyAmount;
  const paidAt = toMySqlDate(paymentDate);

  try {
    await connection.query(
      `INSERT INTO cycle_payment_status
         (user_id, cycle_year, is_paid, payment_date,
          amount_paid, penalty_amount, total_amount,
          payment_reference, status, created_at, updated_at)
       VALUES (?, ?, TRUE, ?, ?, ?, ?, ?, 'paid', NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         is_paid           = TRUE,
         payment_date      = VALUES(payment_date),
         amount_paid       = VALUES(amount_paid),
         penalty_amount    = VALUES(penalty_amount),
         total_amount      = VALUES(total_amount),
         payment_reference = VALUES(payment_reference),
         status            = 'paid',
         updated_at        = NOW()`,
      [
        userId,
        cycleYear,
        paidAt,
        baseAmount,
        penaltyAmount,
        totalAmount,
        paymentReference || null,
      ]
    );
  } catch (err) {
    console.warn(
      '[recordCycleAndUserStatus] cycle_payment_status upsert failed:',
      (err as Error).message
    );
  }

  try {
    await connection.query(
      `INSERT INTO user_membership_status
         (user_id, is_new_member, first_membership_cycle, current_cycle_year,
          status, payment_status, updated_at)
       VALUES (?, FALSE, ?, ?, 'active', 'paid', NOW())
       ON DUPLICATE KEY UPDATE
         current_cycle_year = GREATEST(current_cycle_year, VALUES(current_cycle_year)),
         status             = 'active',
         payment_status     = 'paid',
         is_new_member      = FALSE,
         updated_at         = NOW()`,
      [userId, cycleYear, cycleYear]
    );
  } catch (err) {
    console.warn(
      '[recordCycleAndUserStatus] user_membership_status upsert failed:',
      (err as Error).message
    );
  }
}

/**
 * Compute the cycle year that "now" belongs to.
 * Feb..Dec -> current year, Jan -> previous year (Jan is part of the
 * cycle that started the prior Feb 1).
 */
export function getCurrentCycleYear(now: Date = new Date()): number {
  return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
}

export interface CyclePricing {
  cycleYear: number;
  baseAmount: number;
  penaltyAmount: number;
  totalDue: number;
  isPaid: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  label: string; // e.g. "Feb 2026 - Jan 2027"
}

/**
 * List the current cycle + up to `maxFuture` future cycles, each with
 * canonical per-cycle pricing (base + penalty) and a paid flag derived
 * from `cycle_payment_status`. The new checkout UI consumes this to let
 * an active member prepay one or more cycles in a single transaction
 * (no discount — every cycle is full price, per requirements).
 */
export async function listFutureUnpaidCycles(args: {
  userId: number;
  maxFuture?: number; // default 2 (so [current, +1, +2] = 3 rows)
  now?: Date;
}): Promise<CyclePricing[]> {
  const { userId, maxFuture = 2, now = new Date() } = args;
  const connection = await pool.getConnection();

  try {
    const category = await getUserCategoryWithin(connection, userId);
    const isNew = await isUserNewWithin(connection, userId);

    const currentCycle = getCurrentCycleYear(now);
    const cycleYears: number[] = [];
    for (let i = 0; i <= maxFuture; i++) cycleYears.push(currentCycle + i);

    let paidSet = new Set<number>();
    try {
      const [rows] = (await connection.query(
        `SELECT cycle_year FROM cycle_payment_status
          WHERE user_id = ? AND is_paid = TRUE AND cycle_year IN (?)`,
        [userId, cycleYears]
      )) as RowDataPacket[];
      paidSet = new Set((rows as any[]).map((r) => Number(r.cycle_year)));
    } catch {
      // Best-effort: missing table => assume nothing paid here.
    }

    return cycleYears.map((cycleYear) => {
      const isPaid = paidSet.has(cycleYear);
      const isCurrent = cycleYear === currentCycle;
      // First-year pricing only applies to truly new users on their very
      // first cycle. Forward-pay cycles are always renewal-priced.
      const treatAsNewUser = isNew && isCurrent;
      const { baseAmount } = getMembershipFee({
        category,
        isFirstYear: treatAsNewUser,
        isNewUser: treatAsNewUser,
      });
      // Only the current cycle can carry a penalty; future cycles haven't
      // started yet so no penalty applies even if user pays late.
      const { penaltyAmount } = isCurrent
        ? calculateEnhancedPenalties({
            baseAmount,
            cycleYear,
            now,
            isNewUser: treatAsNewUser,
            category,
          })
        : { penaltyAmount: 0 };
      return {
        cycleYear,
        baseAmount,
        penaltyAmount,
        totalDue: baseAmount + penaltyAmount,
        isPaid,
        isCurrent,
        isFuture: cycleYear > currentCycle,
        label: `Feb ${cycleYear} - Jan ${cycleYear + 1}`,
      };
    });
  } finally {
    connection.release();
  }
}

async function getUserCategoryWithin(
  connection: any,
  userId: number
): Promise<'librarian' | 'organization' | 'regular'> {
  try {
    const [rows] = (await connection.query(
      `SELECT user_category FROM users WHERE id = ?`,
      [userId]
    )) as RowDataPacket[];
    return (rows as any[])[0]?.user_category || 'regular';
  } catch {
    return 'regular';
  }
}

async function isUserNewWithin(connection: any, userId: number): Promise<boolean> {
  try {
    const [rows] = (await connection.query(
      `SELECT COUNT(*) AS c FROM cycle_payment_status
        WHERE user_id = ? AND is_paid = TRUE`,
      [userId]
    )) as RowDataPacket[];
    return Number((rows as any[])[0]?.c || 0) === 0;
  } catch {
    try {
      const [rows] = (await connection.query(
        `SELECT COUNT(*) AS c FROM payments
          WHERE user_id = ? AND status = 'completed'`,
        [userId]
      )) as RowDataPacket[];
      return Number((rows as any[])[0]?.c || 0) === 0;
    } catch {
      return true;
    }
  }
}

/**
 * Get user category for fee calculation
 */
export async function getUserCategory(userId: number): Promise<'librarian' | 'organization' | 'regular'> {
    const connection = await pool.getConnection();
    
    try {
        const [rows] = await connection.query(
            `SELECT user_category FROM users WHERE id = ?`,
            [userId]
        ) as RowDataPacket[];
        
        return rows[0]?.user_category || 'regular';
    } finally {
        connection.release();
    }
}
