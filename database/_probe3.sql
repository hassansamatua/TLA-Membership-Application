SELECT 'user_membership_status cols:' AS section;
SHOW COLUMNS FROM user_membership_status;

SELECT 'memberships cols:' AS section;
SHOW COLUMNS FROM memberships;

SELECT 'user_profiles row containing TLA2633387:' AS section;
SELECT user_id, membership_number, membership_status, join_date
  FROM user_profiles WHERE membership_number='TLA2633387';

SELECT 'any user_membership_status rows (first 15):' AS section;
SELECT * FROM user_membership_status ORDER BY user_id DESC LIMIT 15;
