-- Update user_profiles membership_number from users table
UPDATE `user_profiles` up
INNER JOIN `users` u ON up.user_id = u.id
SET up.membership_number = u.membership_number,
    up.updated_at = NOW()
WHERE u.membership_number IS NOT NULL AND u.membership_number != '';
