-- Create profile records for users who don't have one
INSERT INTO `user_profiles` (
  `user_id`, 
  `phone`, 
  `membership_number`, 
  `membership_type`, 
  `membership_status`,
  `join_date`,
  `created_at`,
  `updated_at`
)
SELECT 
  u.id,
  u.phone_number,
  u.membership_number,
  u.membership_type,
  CASE WHEN u.is_approved = 1 THEN 'Active' ELSE 'Pending' END,
  u.created_at,
  NOW(),
  NOW()
FROM `users` u
LEFT JOIN `user_profiles` up ON u.id = up.user_id
WHERE up.user_id IS NULL;
