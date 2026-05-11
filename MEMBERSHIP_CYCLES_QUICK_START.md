# Membership Cycle System - Quick Start Guide

## Step 1: Run the Database Migration

Execute the migration to create all necessary tables:

```bash
php run_membership_cycles_migration.php
```

This creates:
- ✅ `membership_cycles` - Fee and grace period config
- ✅ `user_membership_status` - User cycle tracking
- ✅ `cycle_payment_status` - Payment tracking per cycle
- ✅ `penalty_notifications` - Notification history
- ✅ Updates to `memberships` table
- ✅ Updates to `payments` table
- ✅ Initial cycle data for 2025-2028

## Step 2: Configure Email/SMS (Optional but Recommended)

Edit your `.env.local` file:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@tanzanialibraryassociation.org

# SMS Configuration (Twilio - optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

Without these, notifications will be logged to console but not actually sent.

## Step 3: Test the Flow

### 3a. Admin Approves a User

When admin approves a member (via admin dashboard):

```bash
curl -X POST http://localhost:3000/api/admin/approve-member \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": 9,
    "membershipType": "personal"
  }'
```

Response:
```json
{
  "success": true,
  "message": "User approved and notification sent",
  "user": {
    "id": 9,
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

This automatically:
- ✅ Marks user as approved
- ✅ Initializes membership cycles (2026 + 2027)
- ✅ Sends approval notification
- ✅ Sets user as "new member" (no penalties for first cycle)

### 3b. Check Payment Status

User checks what they owe:

```bash
curl http://localhost:3000/api/payments/payment-status \
  -H "Authorization: Bearer USER_TOKEN"
```

Response (in grace period):
```json
{
  "approved": true,
  "isNewMember": true,
  "paymentStatus": "grace_period",
  "cycles": [
    {
      "cycleYear": 2026,
      "isPaid": false,
      "baseFee": 50000,
      "penalty": 0,
      "totalDue": 50000,
      "inGracePeriod": true,
      "gracePeriodEnd": "2026-04-01"
    }
  ],
  "summary": {
    "unpaidCycleCount": 1,
    "totalDue": 50000,
    "totalPenalty": 0,
    "paymentDeadline": "2026-04-01"
  }
}
```

### 3c. User Makes Payment

After payment is processed by AzamPay:

```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "paymentReference": "TEST-1234567890",
    "amount": 50000,
    "paymentMethod": "halopesa"
  }'
```

Response:
```json
{
  "success": true,
  "payment": {
    "reference": "TEST-1234567890",
    "amount": 50000,
    "penalty": 0,
    "baseFee": 50000,
    "cyclesPaid": [2026],
    "paymentDate": "2026-01-15"
  },
  "message": "Payment successful! Paid 1 cycle(s) with no penalties"
}
```

This automatically:
- ✅ Records payment in database
- ✅ Marks 2026 cycle as paid
- ✅ Updates membership status to active
- ✅ Sends payment confirmation
- ✅ Marks user as "continuous" member (for future cycles)

### 3d. Late Payment Scenario

If user pays after April 1:

Current date: May 1, 2026
Unpaid cycles: 2025 (full year), 2026 (1 month into penalty)

System calculates:
```
2025 cycle: 50,000 + (12 months × 1,000) = 62,000 TZS
2026 cycle: 50,000 + (1 month × 1,000) = 51,000 TZS
Total: 113,000 TZS
```

## Step 4: Set Up Scheduled Notifications (Cron Jobs)

### Grace Period Reminder (March 15)

Create a cron job to run at 10 AM on March 15:

```typescript
// pages/api/cron/grace-period-reminder.ts
import { pool } from '@/lib/db';
import { sendGracePeriodReminder } from '@/lib/notificationService';
import { MEMBERSHIP_CYCLE_CONFIG } from '@/lib/membershipCycles';

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const connection = await pool.getConnection();
  
  try {
    const today = new Date();
    
    // Find users with unpaid current cycle
    const [users] = await connection.query(
      `SELECT u.id, u.name, u.email, cps.cycle_year, mc.base_fee
       FROM users u
       JOIN cycle_payment_status cps ON u.id = cps.user_id
       JOIN membership_cycles mc ON cps.cycle_year = mc.cycle_year
       WHERE cps.is_paid = FALSE 
         AND cps.cycle_year = YEAR(NOW())
         AND MONTH(NOW()) = 3`
    );

    for (const user of users) {
      await sendGracePeriodReminder(
        user.id,
        user.name,
        user.cycle_year,
        user.base_fee
      );
    }

    return new Response(`Sent ${users.length} grace period reminders`, { status: 200 });
  } finally {
    connection.release();
  }
}
```

### Penalty Warning (April 1)

Create a cron job to run at 12 AM on April 1:

```typescript
// pages/api/cron/penalty-warning.ts
import { pool } from '@/lib/db';
import { sendPenaltyWarning } from '@/lib/notificationService';
import { calculatePenalty } from '@/lib/membershipCycles';

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const connection = await pool.getConnection();
  
  try {
    // Find users with unpaid current cycle on penalty start date
    const [users] = await connection.query(
      `SELECT u.id, u.name, u.email, ums.is_new_member, cps.cycle_year, mc.base_fee
       FROM users u
       JOIN user_membership_status ums ON u.id = ums.user_id
       JOIN cycle_payment_status cps ON u.id = cps.user_id
       JOIN membership_cycles mc ON cps.cycle_year = mc.cycle_year
       WHERE cps.is_paid = FALSE 
         AND cps.cycle_year = YEAR(NOW())
         AND DATE(NOW()) = mc.penalty_start_date`
    );

    for (const user of users) {
      const penalty = calculatePenalty(
        new Date(),
        user.cycle_year,
        !user.is_new_member
      );
      
      await sendPenaltyWarning(
        user.id,
        user.name,
        user.cycle_year,
        user.base_fee,
        penalty,
        user.base_fee + penalty
      );
    }

    return new Response(`Sent ${users.length} penalty warnings`, { status: 200 });
  } finally {
    connection.release();
  }
}
```

## Key Rules Summary

| Scenario | Grace Period | Penalty | Amount |
|----------|-------------|---------|--------|
| New user, Feb-Mar | ✅ Yes | No | 50,000 TZS |
| New user, Apr+ | ✅ Yes (only first time) | Yes (from Apr) | 50,000 + penalty |
| Continuous user, Feb-Mar | ✅ Yes | No | 50,000 TZS |
| Continuous user, Apr+ | No | Yes | 50,000 + penalty |
| Penalty formula | - | 1,000 TZS per month | Monthly calc |

## Troubleshooting

### User not appearing in payment status
- Check `user_membership_status` table - user must have a record
- Verify admin approved the user via `/api/admin/approve-member`
- Check `is_approved` flag in `users` table

### Penalties not calculating
- Ensure current date is after April 1
- Verify `user_membership_status.is_new_member` is FALSE for continuous users
- Check `cycle_payment_status.is_paid` - should be FALSE for unpaid cycles

### Email notifications not sending
- Configure EMAIL_* env vars
- Check logs for errors
- Verify recipient email is correct in `users` table
- Test manually: Use your email provider's test feature

### Wrong penalty amount
- Check `getCycleYearForDate()` returns correct year
- Verify current date (for testing, you may need to mock)
- Ensure `isInGracePeriod()` returns correct boolean

## Testing Checklist

- [ ] Migration runs without errors
- [ ] All 4 new tables created successfully
- [ ] Cycle data for 2025-2028 exists
- [ ] Admin can approve a user
- [ ] Approved user sees payment status
- [ ] User can make payment during grace period
- [ ] Penalty calculation works for late payments
- [ ] User marked as continuous after first payment
- [ ] Notifications logged/sent correctly
- [ ] Early payment allowed from October onwards

## Next Steps

1. Run the migration: `php run_membership_cycles_migration.php`
2. Configure email/SMS in `.env.local`
3. Test the flow manually
4. Set up cron jobs for scheduled notifications
5. Update UI components to show cycle information
6. Test edge cases (late payments, multiple unpaid cycles, etc.)

---

For detailed documentation, see: [MEMBERSHIP_CYCLES_IMPLEMENTATION.md](./MEMBERSHIP_CYCLES_IMPLEMENTATION.md)
