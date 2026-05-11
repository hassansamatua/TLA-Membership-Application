-- Check if specific user exists and show their details
-- Replace USER_ID with the actual ID you're trying to access
SELECT 
  u.id,
  u.name,
  u.email,
  u.is_approved,
  up.user_id as has_profile
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.id = USER_ID;
