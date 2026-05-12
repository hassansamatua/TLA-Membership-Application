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
    
    // After April 1: Calculate penalty based on cycle dates
    const monthsOverdue = Math.max(0, Math.floor((nowDateOnly.getTime() - cycleDates.penaltyStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
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
