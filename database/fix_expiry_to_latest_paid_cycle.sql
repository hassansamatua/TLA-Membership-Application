-- Re-pin every membership.expiry_date to Jan 31 of (max paid cycle + 1).
-- Picks the highest cycle_year across cycle_payment_status (preferred) and
-- membership_payments. Idempotent and safe to re-run.
UPDATE memberships m
  JOIN (
    SELECT user_id, MAX(cycle_year) AS last_paid_cycle
      FROM (
        SELECT user_id, cycle_year
          FROM cycle_payment_status
         WHERE is_paid = TRUE AND cycle_year IS NOT NULL
        UNION
        SELECT user_id, cycle_year
          FROM membership_payments
         WHERE status = 'completed' AND cycle_year IS NOT NULL
      ) u
     GROUP BY user_id
  ) lp ON lp.user_id = m.user_id
SET m.expiry_date = STR_TO_DATE(
      CONCAT(lp.last_paid_cycle + 1, '-01-31'), '%Y-%m-%d'
    ),
    m.updated_at = NOW()
WHERE m.expiry_date IS NULL
   OR m.expiry_date < STR_TO_DATE(
        CONCAT(lp.last_paid_cycle + 1, '-01-31'), '%Y-%m-%d'
      );

SELECT m.id, m.user_id, m.membership_number,
       DATE_FORMAT(m.expiry_date, '%Y-%m-%d') AS expiry_date,
       m.payment_status
  FROM memberships m
 WHERE m.membership_number = 'TLA2633387';
