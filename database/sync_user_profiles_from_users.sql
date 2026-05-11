-- Sync all common fields from users table to user_profiles
UPDATE `user_profiles` up
INNER JOIN `users` u ON up.user_id = u.id
SET 
    up.phone = u.phone,
    up.membership_number = u.membership_number,
    up.membership_type = u.membership_type,
    up.membership_status = u.membership_status,
    up.membership_expiry = u.membership_expiry,
    up.updated_at = NOW()
WHERE u.phone IS NOT NULL OR u.membership_number IS NOT NULL OR u.membership_type IS NOT NULL;
