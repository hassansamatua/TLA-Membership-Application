SELECT 'paid payments with cycle metadata (last 15):' AS section;
SELECT id, user_id, reference, status, amount, cycle_year,
       target_cycle_year, cycle_count, paid_at
  FROM payments
 WHERE status = 'completed'
 ORDER BY paid_at DESC, id DESC
 LIMIT 15;

SELECT 'memberships rows for those users:' AS section;
SELECT m.user_id, m.membership_number, m.expiry_date, m.payment_status, m.updated_at
  FROM memberships m
 WHERE m.user_id IN (
   SELECT DISTINCT user_id FROM payments
    WHERE status = 'completed'
      AND (target_cycle_year IS NOT NULL OR cycle_count > 1)
 )
 ORDER BY m.user_id DESC;

SELECT 'paid users WITHOUT memberships row:' AS section;
SELECT DISTINCT p.user_id, MAX(p.target_cycle_year) AS target,
       MAX(p.cycle_count) AS ccount, MAX(p.paid_at) AS last_paid
  FROM payments p
 WHERE p.status = 'completed'
   AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = p.user_id)
 GROUP BY p.user_id
 ORDER BY last_paid DESC LIMIT 20;
