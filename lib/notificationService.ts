/**
 * Membership Notification System
 * Handles: Admin approval notifications, grace period reminders, penalty warnings
 */

import nodemailer from 'nodemailer';
import { pool } from './db';
import type { RowDataPacket } from 'mysql2';
import {
  ENHANCED_MEMBERSHIP_CONFIG,
  getMembershipFee,
} from './enhancedMembershipCycles';

// SMS service - using Twilio or similar (placeholder)
// For now, we'll use a placeholder that logs to console
// In production, integrate with actual SMS provider

export type NotificationType =
  | 'approval'
  | 'rejection'
  | 'grace_period_reminder'
  | 'penalty_warning'
  | 'overdue_notice'
  | 'upcoming_cycle_reminder'
  | 'payment_confirmation';
export type NotificationChannel = 'email' | 'sms' | 'both';

/**
 * Idempotency guard: returns true if a notification of `type` has already
 * been recorded for this user/cycle. Callers should bail out instead of
 * resending duplicates.
 *
 * Best-effort: if the `penalty_notifications` table is missing it logs and
 * returns false so the caller continues normally.
 */
export async function hasNotificationBeenSent(
  userId: number,
  cycleYear: number,
  notificationType: NotificationType
): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const [rows] = (await connection.query(
      `SELECT id FROM penalty_notifications
        WHERE user_id = ? AND cycle_year = ? AND notification_type = ?
        LIMIT 1`,
      [userId, cycleYear, notificationType]
    )) as [RowDataPacket[], any];
    return rows.length > 0;
  } catch (err) {
    console.warn(
      '[NOTIF] penalty_notifications lookup failed (table missing?):',
      (err as Error).message
    );
    return false;
  } finally {
    connection.release();
  }
}

interface UserNotificationPreference {
  email: string;
  phone?: string;
  preferredChannel: 'email' | 'sms' | 'both';
}

/**
 * Send notification via email
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<boolean> {
  try {
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailSecure = process.env.EMAIL_SECURE === 'true';

    console.log('[NOTIF] Email config:', {
      host: emailHost,
      port: emailPort,
      user: emailUser,
      secure: emailSecure,
      hasPassword: !!emailPassword,
    });

    if (!emailHost || !emailUser || !emailPassword) {
      console.error('[NOTIF] Missing email configuration:', {
        host: !!emailHost,
        user: !!emailUser,
        password: !!emailPassword,
      });
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort ? parseInt(emailPort) : 587,
      secure: emailSecure,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    console.log('[NOTIF] Sending email to:', to);

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || emailUser,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('[NOTIF] Email sent successfully:', result.response);
    return true;
  } catch (error) {
    console.error('[NOTIF] Email send error:', error);
    return false;
  }
}

/**
 * Send SMS notification via Twilio or similar
 */
export async function sendSmsNotification(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    // Example with Twilio SDK (requires: npm install twilio)
    // const twilio = require('twilio');
    // const client = twilio(
    //   process.env.TWILIO_ACCOUNT_SID,
    //   process.env.TWILIO_AUTH_TOKEN
    // );
    
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber,
    // });

    // For now, just log it (implement with real SMS service)
    console.log(`[SMS NOTIFICATION] To: ${phoneNumber} | Message: ${message}`);
    return true;
  } catch (error) {
    console.error('SMS send error:', error);
    return false;
  }
}

/**
 * Get user contact preferences
 */
export async function getUserNotificationPreference(userId: number): Promise<UserNotificationPreference | null> {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.query(
      `SELECT u.email, up.phone
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ?`,
      [userId]
    ) as [RowDataPacket[], any];
    
    if (rows.length === 0) return null;
    
    return {
      email: rows[0].email,
      phone: rows[0].phone || undefined,
      preferredChannel: 'email', // Default to email
    };
  } finally {
    connection.release();
  }
}

/**
 * Send approval notification (after admin approves user)
 */
function resolveCategory(
  membershipType: string
): 'librarian' | 'organization' | 'regular' {
  const t = (membershipType || '').toLowerCase();
  if (t.includes('organ')) return 'organization';
  if (t.includes('librar')) return 'librarian';
  return 'regular';
}

export async function sendApprovalNotification(
  userId: number,
  userName: string,
  membershipType: string
): Promise<boolean> {
  const preferences = await getUserNotificationPreference(userId);
  if (!preferences) return false;

  // Compute the correct first-year fee from the canonical schedule instead
  // of the previously hard-coded 50,000.
  const category = resolveCategory(membershipType);
  const { baseAmount } = getMembershipFee({
    category,
    isFirstYear: true,
    isNewUser: true,
  });
  const feeText = `${baseAmount.toLocaleString()} TZS`;

  const htmlContent = `
    <h2>Welcome to Tanzania Library Association!</h2>
    <p>Dear ${userName},</p>
    <p>Congratulations! Your membership application has been approved.</p>
    <p><strong>Membership Type:</strong> ${membershipType}</p>
    <p><strong>Cycle:</strong> February 1 - January 31</p>
    <p><strong>Base Fee (new member):</strong> ${feeText}</p>
    <p>You now have a grace period until March 31 to make your payment without any penalties.</p>
    <p>After March 31, if payment is not received, a penalty of 1,000 TZS per month will apply.</p>
    <p><a href="http://localhost:3000/dashboard/payment">Pay Now</a></p>
    <p>Best regards,<br>Tanzania Library Association</p>
  `;

  const textContent = `
Welcome to Tanzania Library Association!

Dear ${userName},

Your membership application has been approved.
Membership Type: ${membershipType}
Cycle: February 1 - January 31
Base Fee (new member): ${feeText}

You have a grace period until March 31 to make payment without penalties.
After March 31, a penalty of 1,000 TZS per month will apply.

Please visit your dashboard to make payment.
  `;

  const channel = preferences.preferredChannel;
  const emailSent = (channel === 'email' || channel === 'both') 
    ? await sendEmailNotification(preferences.email, 'Your Membership Has Been Approved', htmlContent, textContent)
    : true;
  
  const smsSent = (channel === 'sms' || channel === 'both')
    ? await sendSmsNotification(preferences.phone || '', 'Your membership has been approved! Visit your dashboard to pay.')
    : true;

  // Record notification
  await recordNotification(userId, new Date().getFullYear(), 'approval', channel);
  
  return emailSent && smsSent;
}

/**
 * Send the "your next cycle starts in one month" reminder.
 * Fires on Jan 1 of cycleYear+1 (i.e. one month before the new Feb 1 cycle
 * begins). Idempotent: a `(user, cycleYear, upcoming_cycle_reminder)` row
 * in `penalty_notifications` short-circuits further sends.
 */
export async function sendUpcomingCycleReminder(
  userId: number,
  userName: string,
  upcomingCycleYear: number,
  membershipType: string,
  isContinuingMember: boolean
): Promise<boolean> {
  if (await hasNotificationBeenSent(userId, upcomingCycleYear, 'upcoming_cycle_reminder')) {
    return true; // already sent — treat as success
  }

  const preferences = await getUserNotificationPreference(userId);
  if (!preferences) return false;

  const category = resolveCategory(membershipType);
  const { baseAmount } = getMembershipFee({
    category,
    isFirstYear: !isContinuingMember,
    isNewUser: !isContinuingMember,
  });
  const feeText = `${baseAmount.toLocaleString()} TZS`;
  const penaltyPerMonth = ENHANCED_MEMBERSHIP_CONFIG.PENALTY_PER_MONTH.toLocaleString();

  const subject = `Reminder: TLA ${upcomingCycleYear} membership cycle starts in one month`;
  const htmlContent = `
    <h2>Your next membership cycle is one month away</h2>
    <p>Dear ${userName},</p>
    <p>This is a friendly reminder that the <strong>${upcomingCycleYear} membership cycle</strong>
       (February 1, ${upcomingCycleYear} &ndash; January 31, ${upcomingCycleYear + 1}) begins in <strong>one month</strong>.</p>
    <p><strong>Amount due:</strong> ${feeText}</p>
    <p><strong>Payment window without penalty:</strong> February 1 &ndash; March 31, ${upcomingCycleYear}</p>
    <p>If payment is not received by March 31, a penalty of ${penaltyPerMonth} TZS per month
       will apply from April 1 onwards.</p>
    <p><a href="http://localhost:3000/dashboard/payment">Pay Now</a></p>
    <p>Best regards,<br>Tanzania Library Association</p>
  `;
  const textContent = `
Your next membership cycle is one month away

Dear ${userName},

The ${upcomingCycleYear} membership cycle (Feb 1, ${upcomingCycleYear} - Jan 31, ${upcomingCycleYear + 1}) begins in one month.
Amount due: ${feeText}
Payment window without penalty: Feb 1 - Mar 31, ${upcomingCycleYear}
After Mar 31, a penalty of ${penaltyPerMonth} TZS per month applies.

Pay online: http://localhost:3000/dashboard/payment
  `;

  const channel = preferences.preferredChannel;
  const emailSent = (channel === 'email' || channel === 'both')
    ? await sendEmailNotification(preferences.email, subject, htmlContent, textContent)
    : true;
  const smsSent = (channel === 'sms' || channel === 'both')
    ? await sendSmsNotification(
        preferences.phone || '',
        `TLA reminder: ${upcomingCycleYear} cycle starts Feb 1. Pay ${feeText} by Mar 31 to avoid penalties.`
      )
    : true;

  await recordNotification(userId, upcomingCycleYear, 'upcoming_cycle_reminder', channel);

  return emailSent && smsSent;
}

/**
 * Send rejection notification (when admin rejects user)
 */
export async function sendRejectionNotification(
  userId: number,
  userName: string,
  rejectionReason?: string
): Promise<boolean> {
  const preferences = await getUserNotificationPreference(userId);
  if (!preferences) return false;
  
  const htmlContent = `
    <h2>Membership Application Status</h2>
    <p>Dear ${userName},</p>
    <p>Unfortunately, your membership application has been rejected.</p>
    ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
    <p>If you believe this is a mistake or would like more information, please contact us.</p>
    <p>Tanzania Library Association<br>
    Email: hanscovd5@gmail.com</p>
  `;
  
  const textContent = `
Membership Application Status

Dear ${userName},

Unfortunately, your membership application has been rejected.
${rejectionReason ? `Reason: ${rejectionReason}` : ''}

If you believe this is a mistake or would like more information, please contact us.

Tanzania Library Association
Email: hanscovd5@gmail.com
  `;

  const channel = preferences.preferredChannel;
  const emailSent = (channel === 'email' || channel === 'both') 
    ? await sendEmailNotification(preferences.email, 'Membership Application Status', htmlContent, textContent)
    : true;
  
  const smsSent = (channel === 'sms' || channel === 'both')
    ? await sendSmsNotification(preferences.phone || '', 'Your membership application has been reviewed.')
    : true;

  // Record notification
  await recordNotification(userId, new Date().getFullYear(), 'rejection', channel);
  
  return emailSent && smsSent;
}

/**
 * Send grace period reminder (mid-grace period, e.g., March 15)
 */
export async function sendGracePeriodReminder(
  userId: number,
  userName: string,
  cycleYear: number,
  amount: number
): Promise<boolean> {
  if (await hasNotificationBeenSent(userId, cycleYear, 'grace_period_reminder')) {
    return true;
  }
  const preferences = await getUserNotificationPreference(userId);
  if (!preferences) return false;
  
  const htmlContent = `
    <h2>Payment Reminder - Grace Period Ending Soon</h2>
    <p>Dear ${userName},</p>
    <p>This is a friendly reminder that your membership payment for the ${cycleYear} cycle is due soon.</p>
    <p><strong>Amount Due:</strong> ${amount.toLocaleString()} TZS (no penalties)</p>
    <p><strong>Grace Period Ends:</strong> March 31, ${cycleYear}</p>
    <p><strong>Penalty After Grace Period:</strong> 1,000 TZS per month</p>
    <p>Please complete your payment before March 31 to avoid penalties.</p>
    <p><a href="http://localhost:3000/dashboard/payment">Pay Now</a></p>
    <p>Best regards,<br>Tanzania Library Association</p>
  `;
  
  const textContent = `
Payment Reminder - Grace Period Ending Soon

Dear ${userName},

Your membership payment for cycle ${cycleYear} is due soon.
Amount Due: ${amount.toLocaleString()} TZS (no penalties)
Grace Period Ends: March 31, ${cycleYear}

Please pay before March 31 to avoid penalties.
  `;

  const channel = preferences.preferredChannel;
  const emailSent = (channel === 'email' || channel === 'both')
    ? await sendEmailNotification(preferences.email, 'Payment Reminder - Grace Period Ending Soon', htmlContent, textContent)
    : true;
  
  const smsSent = (channel === 'sms' || channel === 'both')
    ? await sendSmsNotification(preferences.phone || '', `Your membership payment is due. Grace period ends March 31. Amount: ${amount.toLocaleString()} TZS`)
    : true;

  await recordNotification(userId, cycleYear, 'grace_period_reminder', channel);
  
  return emailSent && smsSent;
}

/**
 * Send penalty warning (April 1 onwards)
 */
export async function sendPenaltyWarning(
  userId: number,
  userName: string,
  cycleYear: number,
  baseFee: number,
  penaltyAmount: number,
  totalAmount: number
): Promise<boolean> {
  // Penalty warnings can legitimately be sent monthly as the penalty grows,
  // so we don't short-circuit here. The cron endpoint enforces a once-per-
  // month cap by checking the most recent sent_date.
  const preferences = await getUserNotificationPreference(userId);
  if (!preferences) return false;
  
  const htmlContent = `
    <h2>Payment Overdue - Penalties Now Apply</h2>
    <p>Dear ${userName},</p>
    <p>Your membership payment for cycle ${cycleYear} is now overdue and penalties have started.</p>
    <p><strong>Base Fee:</strong> ${baseFee.toLocaleString()} TZS</p>
    <p><strong>Penalty Applied:</strong> ${penaltyAmount.toLocaleString()} TZS (1,000 TZS per month)</p>
    <p><strong>Total Amount Due:</strong> ${totalAmount.toLocaleString()} TZS</p>
    <p>Please complete your payment as soon as possible. The penalty will increase by 1,000 TZS for each additional month.</p>
    <p><a href="http://localhost:3000/dashboard/payment">Pay Now</a></p>
    <p>Best regards,<br>Tanzania Library Association</p>
  `;
  
  const textContent = `
Payment Overdue - Penalties Now Apply

Dear ${userName},

Your membership payment for cycle ${cycleYear} is overdue.
Base Fee: ${baseFee.toLocaleString()} TZS
Penalty: ${penaltyAmount.toLocaleString()} TZS
Total Due: ${totalAmount.toLocaleString()} TZS

Please pay immediately to avoid further penalties.
  `;

  const channel = preferences.preferredChannel;
  const emailSent = (channel === 'email' || channel === 'both')
    ? await sendEmailNotification(preferences.email, 'Payment Overdue - Penalties Now Apply', htmlContent, textContent)
    : true;
  
  const smsSent = (channel === 'sms' || channel === 'both')
    ? await sendSmsNotification(preferences.phone || '', `Your membership payment is overdue. Total due: ${totalAmount.toLocaleString()} TZS with penalties.`)
    : true;

  await recordNotification(userId, cycleYear, 'penalty_warning', channel);
  
  return emailSent && smsSent;
}

/**
 * Send payment confirmation
 */
export async function sendPaymentConfirmation(
  userId: number,
  userName: string,
  paymentReference: string,
  amount: number,
  cycleYear: number
): Promise<boolean> {
  const preferences = await getUserNotificationPreference(userId);
  if (!preferences) return false;
  
  const htmlContent = `
    <h2>Payment Received</h2>
    <p>Dear ${userName},</p>
    <p>Thank you for your payment!</p>
    <p><strong>Payment Reference:</strong> ${paymentReference}</p>
    <p><strong>Amount Paid:</strong> ${amount.toLocaleString()} TZS</p>
    <p><strong>Cycle:</strong> ${cycleYear}</p>
    <p>Your membership is now active for this cycle.</p>
    <p><a href="http://localhost:3000/dashboard/membership-card">View Your Membership Card</a></p>
    <p>Best regards,<br>Tanzania Library Association</p>
  `;
  
  const textContent = `
Payment Received

Dear ${userName},

Thank you for your payment!
Payment Reference: ${paymentReference}
Amount: ${amount.toLocaleString()} TZS
Cycle: ${cycleYear}

Your membership is now active.
  `;

  // Payment confirmations always go out on BOTH channels regardless of
  // the user's preferredChannel — this is a transactional receipt the
  // member must always see, per requirements.
  const emailSent = preferences.email
    ? await sendEmailNotification(preferences.email, 'Payment Received', htmlContent, textContent)
    : false;

  const smsSent = preferences.phone
    ? await sendSmsNotification(
        preferences.phone,
        `TLA: Payment received. Ref ${paymentReference}, TZS ${amount.toLocaleString()} for cycle ${cycleYear}. Membership active.`
      )
    : false;

  try {
    await recordNotification(userId, cycleYear, 'payment_confirmation', 'both');
  } catch {
    // best-effort
  }

  // Return true if at least one channel succeeded so callers don't fail
  // a successful payment just because SMS is misconfigured.
  return emailSent || smsSent;
}

/**
 * Record notification in database
 */
export async function recordNotification(
  userId: number,
  cycleYear: number,
  notificationType: NotificationType,
  sentVia: NotificationChannel = 'email'
): Promise<void> {
  const connection = await pool.getConnection();
  
  try {
    await connection.query(
      `INSERT INTO penalty_notifications 
       (user_id, cycle_year, notification_type, sent_via)
       VALUES (?, ?, ?, ?)`,
      [userId, cycleYear, notificationType, sentVia]
    );
  } catch (err) {
    // The enum on penalty_notifications.notification_type may not yet include
    // newer values (upcoming_cycle_reminder, payment_confirmation, rejection)
    // on older deployments. Log and continue rather than failing the caller;
    // the migration in Phase G extends the enum.
    console.warn(
      '[NOTIF] recordNotification failed (enum/schema mismatch?):',
      (err as Error).message
    );
  } finally {
    connection.release();
  }
}

/**
 * Get notification history for a user
 */
export async function getNotificationHistory(userId: number, cycleYear?: number) {
  const connection = await pool.getConnection();
  
  try {
    let query = `SELECT * FROM penalty_notifications WHERE user_id = ?`;
    const params: any[] = [userId];
    
    if (cycleYear) {
      query += ` AND cycle_year = ?`;
      params.push(cycleYear);
    }
    
    query += ` ORDER BY sent_date DESC LIMIT 50`;
    
    const [rows] = await connection.query(query, params) as [RowDataPacket[], any];
    return rows;
  } finally {
    connection.release();
  }
}
