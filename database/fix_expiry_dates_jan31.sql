-- Force every membership row's expiry_date to Jan 31 of (cycleYear + 1),
-- where cycleYear is derived from the payment date (or joined_date /
-- created_at fallback). This is a one-shot corrective sweep that ignores
-- payment_status so previously-broken rows get fixed regardless of state.
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
     ),
     updated_at = NOW()
 WHERE DATE_FORMAT(expiry_date, '%m-%d') <> '01-31'
    OR expiry_date IS NULL;

SELECT id, user_id, membership_number,
       DATE_FORMAT(payment_date, '%Y-%m-%d') AS payment_date,
       DATE_FORMAT(expiry_date, '%Y-%m-%d')  AS expiry_date,
       payment_status
  FROM memberships
 WHERE membership_number = 'TLA2633387';
