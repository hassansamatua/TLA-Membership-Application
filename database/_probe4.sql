SELECT 'memberships exact:' AS section;
SELECT id, user_id, membership_number, expiry_date, payment_status, created_at, updated_at
  FROM memberships
 WHERE membership_number='TLA2633387' OR membership_number LIKE '%2633387%';

SELECT 'user_profiles exact:' AS section;
SELECT user_id, membership_number, membership_status, join_date
  FROM user_profiles
 WHERE membership_number='TLA2633387' OR membership_number LIKE '%2633387%';

SELECT 'any TLA% in user_profiles:' AS section;
SELECT user_id, membership_number, membership_status, join_date
  FROM user_profiles
 WHERE membership_number LIKE 'TLA%'
 ORDER BY user_id DESC LIMIT 15;
