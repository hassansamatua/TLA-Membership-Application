-- ============================================================================
--  Membership cycle system overhaul migration
--  --------------------------------------------------------------------------
--  Applies the schema + data fixes required by the canonical cycle/fee
--  logic in lib/enhancedMembershipCycles.ts:
--    1. Extend penalty_notifications.notification_type enum
--    2. Backfill payments.cycle_year and membership_payments.cycle_year
--    3. Pin memberships.expiry_date to Jan 31 of (cycle_year + 1)
--    4. Backfill cycle_payment_status from completed membership_payments
--    5. Backfill user_membership_status from memberships
--
--  Safe to run multiple times: every step is idempotent / guarded.
--  Run from XAMPP MySQL:
--    mysql -u root -p<password> next_auth < database/migration_membership_cycle_overhaul.sql
-- ============================================================================

SET @@SESSION.sql_mode = REPLACE(@@SESSION.sql_mode, 'STRICT_TRANS_TABLES', '');

-- ----------------------------------------------------------------------------
-- 1. Extend penalty_notifications.notification_type to cover new event types
-- ----------------------------------------------------------------------------
ALTER TABLE penalty_notifications
  MODIFY COLUMN notification_type ENUM(
    'approval',
    'rejection',
    'grace_period_reminder',
    'penalty_warning',
    'overdue_notice',
    'upcoming_cycle_reminder',
    'payment_confirmation'
  ) NOT NULL;

-- Helpful supporting index for the idempotency lookups in lib/notificationService.ts
-- (no-op if it already exists).
SET @stmt := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'penalty_notifications'
      AND INDEX_NAME = 'idx_pn_user_cycle_type') = 0,
  'CREATE INDEX idx_pn_user_cycle_type ON penalty_notifications (user_id, cycle_year, notification_type)',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- ----------------------------------------------------------------------------
-- 2. Backfill payments.cycle_year from the payment timestamp.
--    Cycle runs Feb 1 -> Jan 31, so:
--      - payments made in January belong to cycle (year - 1)
--      - payments made Feb..Dec belong to cycle (year)
-- ----------------------------------------------------------------------------
SET @has_payments_cycle := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'payments'
     AND COLUMN_NAME = 'cycle_year'
);
SET @stmt := IF(@has_payments_cycle = 0,
  'ALTER TABLE payments ADD COLUMN cycle_year INT(11) NULL AFTER status',
  'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE payments
   SET cycle_year = CASE
     WHEN MONTH(COALESCE(paid_at, created_at)) = 1
       THEN YEAR(COALESCE(paid_at, created_at)) - 1
     ELSE YEAR(COALESCE(paid_at, created_at))
   END
 WHERE cycle_year IS NULL
   AND COALESCE(paid_at, created_at) IS NOT NULL;

-- Same backfill for membership_payments.cycle_year.
SET @has_mp_cycle := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'membership_payments'
     AND COLUMN_NAME = 'cycle_year'
);
SET @stmt := IF(@has_mp_cycle = 0,
  'ALTER TABLE membership_payments ADD COLUMN cycle_year INT(11) NULL',
  'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE membership_payments
   SET cycle_year = CASE
     WHEN MONTH(COALESCE(payment_date, created_at)) = 1
       THEN YEAR(COALESCE(payment_date, created_at)) - 1
     ELSE YEAR(COALESCE(payment_date, created_at))
   END
 WHERE cycle_year IS NULL
   AND COALESCE(payment_date, created_at) IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Pin memberships.expiry_date to Jan 31 of (cycle_year + 1).
--    The old code wrote `payment_date + 1 year` which slid the expiry by
--    however many days after Feb 1 the user paid. We re-anchor every
--    membership to the canonical Jan 31 boundary.
-- ----------------------------------------------------------------------------
UPDATE memberships
   SET expiry_date = STR_TO_DATE(
       CONCAT(
         CASE
           WHEN MONTH(COALESCE(payment_date, joined_date, created_at)) = 1
             THEN YEAR(COALESCE(payment_date, joined_date, created_at))
           ELSE YEAR(COALESCE(payment_date, joined_date, created_at)) + 1
         END,
         '-01-31'
       ),
       '%Y-%m-%d'
     )
 WHERE payment_status = 'paid'
   AND (
     expiry_date IS NULL
     OR DATE_FORMAT(expiry_date, '%m-%d') <> '01-31'
   );

-- ----------------------------------------------------------------------------
-- 4. Backfill cycle_payment_status from completed membership_payments where
--    no row exists for that (user_id, cycle_year) yet.
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO cycle_payment_status
  (user_id, cycle_year, is_paid, payment_date, amount_paid,
   penalty_amount, total_amount, payment_reference, status,
   created_at, updated_at)
SELECT mp.user_id,
       mp.cycle_year,
       1                                                AS is_paid,
       COALESCE(mp.payment_date, mp.created_at)         AS payment_date,
       mp.amount                                        AS amount_paid,
       0                                                AS penalty_amount,
       mp.amount                                        AS total_amount,
       mp.reference                                     AS payment_reference,
       'paid'                                           AS status,
       NOW(), NOW()
  FROM membership_payments mp
  LEFT JOIN cycle_payment_status cps
    ON cps.user_id = mp.user_id AND cps.cycle_year = mp.cycle_year
 WHERE mp.status = 'completed'
   AND mp.cycle_year IS NOT NULL
   AND cps.id IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Backfill user_membership_status from memberships when missing.
--    `first_membership_cycle` is the smallest cycle_year ever paid (used by
--    the cron job to identify penalty-exempt new members).
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO user_membership_status
  (user_id, is_new_member, first_membership_cycle, current_cycle_year,
   status, payment_status, last_payment_date, next_due_date,
   created_at, updated_at)
SELECT m.user_id,
       CASE WHEN agg.first_cycle IS NULL THEN 1 ELSE 0 END AS is_new_member,
       agg.first_cycle                                     AS first_membership_cycle,
       COALESCE(agg.latest_cycle, YEAR(CURDATE()))         AS current_cycle_year,
       CASE
         WHEN m.expiry_date IS NULL OR m.expiry_date < CURDATE() THEN 'expired'
         ELSE 'active'
       END                                                 AS status,
       CASE WHEN m.payment_status = 'paid' THEN 'paid' ELSE 'pending' END AS payment_status,
       m.payment_date                                      AS last_payment_date,
       m.expiry_date                                       AS next_due_date,
       NOW(), NOW()
  FROM memberships m
  LEFT JOIN (
     SELECT user_id,
            MIN(cycle_year) AS first_cycle,
            MAX(cycle_year) AS latest_cycle
       FROM membership_payments
      WHERE status = 'completed' AND cycle_year IS NOT NULL
      GROUP BY user_id
  ) agg ON agg.user_id = m.user_id
  LEFT JOIN user_membership_status ums ON ums.user_id = m.user_id
 WHERE ums.id IS NULL;

-- ----------------------------------------------------------------------------
-- Done. Confirm row counts so the operator can sanity-check the migration.
-- ----------------------------------------------------------------------------
SELECT 'payments.cycle_year filled'   AS metric, COUNT(*) AS rows_with_cycle FROM payments            WHERE cycle_year IS NOT NULL;
SELECT 'membership_payments filled'    AS metric, COUNT(*) AS rows_with_cycle FROM membership_payments WHERE cycle_year IS NOT NULL;
SELECT 'memberships pinned Jan-31'     AS metric, COUNT(*) AS rows
  FROM memberships WHERE DATE_FORMAT(expiry_date, '%m-%d') = '01-31';
SELECT 'cycle_payment_status rows'     AS metric, COUNT(*) AS rows FROM cycle_payment_status;
SELECT 'user_membership_status rows'   AS metric, COUNT(*) AS rows FROM user_membership_status;
