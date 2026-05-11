# Membership Cycle System Implementation

## Overview

This document describes the complete membership cycle system with penalties, grace periods, and notification logic.

## Key Concepts

### Membership Cycles
- **Cycle Period**: February 1 - January 31 (annual)
- **Base Fee**: 50,000 TZS per cycle
- **Grace Period**: February 1 - March 31 (no penalties)
- **Penalty Period**: April 1 - January 31 (1,000 TZS per month)

### User Types

#### New Members
- Users during their first joining month/cycle pay NO penalties
- Penalties start from the SECOND cycle onwards
- First payment only covers base fee for current cycle

#### Continuous Members
- Users with 2+ cycles
- Grace period still applies (Feb 1 - Mar 31)
- After March 31, penalties apply: 1,000 TZS per month

### Penalty Calculation

```
if (currentDate < Apr 1) {
  penalty = 0  // Grace period
} else {
  monthsPassed = months from Apr 1 to currentDate
  penalty = monthsPassed * 1,000 TZS
}

Example: If paying on May 15
  Months from Apr 1 to May 15 = 1+ month = 1 month
  Penalty = 1 * 1,000 = 1,000 TZS
  Total Due = 50,000 + 1,000 = 51,000 TZS
```

## Database Schema

### New Tables

#### membership_cycles
Stores cycle configuration and fee structure
```sql
id, cycle_year, start_date, end_date, grace_period_end, 
penalty_start_date, base_fee, penalty_per_month
```

#### user_membership_status
Tracks user's membership journey and current status
```sql
id, user_id, is_new_member, first_membership_cycle, 
current_cycle_year, status, payment_status, last_payment_date, next_due_date
```

#### cycle_payment_status
Tracks payment for each user per cycle
```sql
id, user_id, cycle_year, is_paid, payment_date, amount_paid, 
penalty_amount, total_amount, payment_reference, status
```

#### penalty_notifications
Tracks notification history
```sql
id, user_id, cycle_year, notification_type, sent_via, sent_date, acknowledged
```

### Modified Tables

#### memberships
Added columns:
- `cycle_year`: Which membership cycle
- `is_new_user_cycle`: Was this user new for this cycle
- `penalty_amount`: Penalty paid with this membership

#### payments
Added columns:
- `cycle_year`: Which cycle payment belongs to
- `penalty_amount`: Penalty included in this payment

## API Endpoints

### 1. Admin Approve Member
**POST** `/api/admin/approve-member`

When admin approves a user:
1. Marks user as approved
2. Initializes membership cycles (current + next)
3. Creates initial membership record
4. Sends approval notification

Request:
```json
{
  "userId": 9,
  "membershipType": "personal"
}
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

### 2. Get Payment Status
**GET** `/api/payments/payment-status`

Get current payment status and unpaid cycles:

Response:
```json
{
  "approved": true,
  "isNewMember": true,
  "currentStatus": "active",
  "paymentStatus": "grace_period",
  
  "cycles": [
    {
      "cycleYear": 2026,
      "isPaid": false,
      "status": "unpaid",
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
    "baseFeeTotal": 50000,
    "totalPenalty": 0,
    "paymentDeadline": "2026-04-01"
  }
}
```

### 3. Process Payment
**POST** `/api/payments/process`

Process payment for one or more cycles:

Request:
```json
{
  "paymentReference": "TEST-1234567890",
  "amount": 50000,
  "paymentMethod": "halopesa",
  "cycleYear": 2026
}
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
  }
}
```

## Notification System

### Notification Types

#### 1. Approval Notification
- Sent when admin approves user
- Via: Email or SMS (user's preference)
- Content: Welcome, membership details, grace period info, payment link

#### 2. Grace Period Reminder
- Sent mid-grace period (around March 15)
- Via: Email or SMS
- Content: Payment reminder, amount due, deadline, no penalty info

#### 3. Penalty Warning
- Sent on April 1 (first day of penalty period)
- Via: Email or SMS
- Content: Payment overdue, penalty applied, total amount with penalty

#### 4. Overdue Notice
- Sent periodically for unpaid cycles (e.g., May, June, etc.)
- Via: Email or SMS
- Content: Overdue amount, accumulated penalties, urgent payment request

#### 5. Payment Confirmation
- Sent after successful payment
- Via: Email or SMS
- Content: Payment received, reference, amount, membership card link

### Notification Channels

Users can choose:
- Email only (default)
- SMS only
- Both

Stored in `user_profiles.notification_preference`

## Helper Functions (lib/membershipCycles.ts)

### Key Functions

```typescript
// Get cycle year for a date
getCycleYearForDate(date) -> number

// Get cycle start/end dates
getCycleDates(cycleYear) -> { startDate, endDate, gracePeriodEndDate, penaltyStartDate }

// Check if in grace period
isInGracePeriod(date, cycleYear) -> boolean

// Get months since cycle start (for penalty)
getMonthsSinceCycleStart(date, cycleYear) -> number

// Calculate penalty
calculatePenalty(paymentDate, cycleYear, isPreviouslyContinuous) -> number

// Get all unpaid cycles
getUnpaidCycles(userId) -> array

// Initialize cycles for new user
initializeUserCycles(userId, joinDate, membershipType) -> void

// Record cycle payment
recordCyclePayment(userId, cycleYear, amount, penalty, paymentRef) -> void

// Calculate total amount due
calculateTotalAmountDue(userId) -> { totalAmount, breakdown }

// Mark user as continuous
markUserAsContinuous(userId) -> void

// Update membership status
updateUserMembershipStatus(userId, status, paymentStatus) -> void
```

## Payment Flow

### New User First Payment
1. User approved → initialized with 2026 cycle
2. User sees: 50,000 TZS (no penalty)
3. During grace period (Feb-Mar): Pay 50,000 TZS
4. System marks 2026 cycle as paid
5. User marked as "continuous" member for future cycles

### Continuous User Late Payment
1. User has unpaid 2025 and 2026 cycles
2. Current date: May 2026
   - 2025 cycle: 50,000 + (12 months * 1,000) = 62,000 TZS
   - 2026 cycle: 50,000 + (1 month * 1,000) = 51,000 TZS
3. Total Due: 113,000 TZS
4. User pays full amount
5. Both cycles marked as paid

### Early Payment (Allowed Oct-Jan)
1. From October onwards, users can pay for next cycle
2. System allows `cycleYear = 2027` when current is 2026
3. Next cycle payment marked as paid
4. Current cycle still requires payment

## Implementation Status

✅ Database schema and migration
✅ Cycle calculation logic
✅ Penalty calculation logic
✅ Notification service foundation
✅ Admin approval endpoint
✅ Payment processing endpoint
✅ Payment status endpoint

⏳ Email/SMS integration (configure with actual provider)
⏳ Scheduled notification jobs (grace period reminder, penalty warning)
⏳ Dashboard UI updates to show cycle info
⏳ Early payment UI implementation
⏳ Penalty notification cron jobs

## Configuration

### Environment Variables

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@tanzanialibraryassociation.org

# SMS Configuration (Twilio example)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Migration

Run the migration:
```bash
php run_membership_cycles_migration.php
```

This creates all necessary tables and initializes cycles for 2025-2028.

## Example Usage

### Approve a New User
```typescript
const response = await fetch('/api/admin/approve-member', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 9,
    membershipType: 'personal'
  })
});
```

### Get Payment Status
```typescript
const status = await fetch('/api/payments/payment-status').then(r => r.json());

if (status.approved) {
  console.log(`Payment due: ${status.summary.totalDue} TZS`);
  console.log(`Unpaid cycles: ${status.summary.unpaidCycleCount}`);
}
```

### Process Payment
```typescript
const payment = await fetch('/api/payments/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentReference: 'TEST-1234567890',
    amount: 50000,
    paymentMethod: 'halopesa'
  })
}).then(r => r.json());
```

## Testing

1. Create test user and approve
2. Check payment status (should show 50,000 TZS)
3. Simulate late payment (change server date or adjust penalty logic)
4. Verify penalty calculation
5. Test SMS/email notifications (check logs in development)

## Future Enhancements

- [ ] Automatic grace period reminders (cron job March 15)
- [ ] Automatic penalty warnings (cron job April 1)
- [ ] Payment plan system (allow installment payments)
- [ ] Membership suspension after prolonged non-payment
- [ ] Bulk notification sending dashboard
- [ ] Analytics on payment trends
- [ ] Dunning management system
- [ ] Integration with accounting/invoicing system
