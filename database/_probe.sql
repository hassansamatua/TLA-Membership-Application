SELECT 'memberships:' AS section;
SELECT id, user_id, membership_number, expiry_date, payment_status, updated_at
  FROM memberships WHERE membership_number='TLA2633387';

SELECT 'payments (last 10 for that user):' AS section;
SELECT p.id, p.reference, p.status, p.amount, p.cycle_year,
       p.target_cycle_year, p.cycle_count, p.paid_at, p.created_at
  FROM payments p
  JOIN memberships m ON m.user_id = p.user_id
 WHERE m.membership_number='TLA2633387'
 ORDER BY p.id DESC LIMIT 10;

SELECT 'cycle_payment_status:' AS section;
SELECT cps.user_id, cps.cycle_year, cps.is_paid, cps.amount_paid, cps.payment_date
  FROM cycle_payment_status cps
  JOIN memberships m ON m.user_id = cps.user_id
 WHERE m.membership_number='TLA2633387'
 ORDER BY cps.cycle_year;

SELECT 'membership_payments:' AS section;
SELECT mp.user_id, mp.cycle_year, mp.amount, mp.status, mp.reference, mp.payment_date
  FROM membership_payments mp
  JOIN memberships m ON m.user_id = mp.user_id
 WHERE m.membership_number='TLA2633387'
 ORDER BY mp.cycle_year;
