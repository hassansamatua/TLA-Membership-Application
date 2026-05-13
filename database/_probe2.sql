SELECT 'memberships LIKE TLA*:' AS section;
SELECT id, user_id, membership_number, expiry_date, payment_status, updated_at
  FROM memberships
 WHERE membership_number LIKE 'TLA%'
 ORDER BY updated_at DESC LIMIT 10;

SELECT 'user_membership_status:' AS section;
SELECT user_id, membership_number, status, payment_status, expiry_date, joined_date, amount_paid
  FROM user_membership_status
 WHERE membership_number LIKE 'TLA%'
 ORDER BY user_id DESC LIMIT 10;

SELECT 'payments recent (any user):' AS section;
SELECT id, user_id, reference, status, amount, cycle_year,
       target_cycle_year, cycle_count, paid_at, created_at
  FROM payments
 ORDER BY id DESC LIMIT 10;
