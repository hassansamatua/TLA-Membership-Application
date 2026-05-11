-- Sync all common fields from users table to user_profiles based on actual users table structure
UPDATE `user_profiles` up
INNER JOIN `users` u ON up.user_id = u.id
SET 
    up.phone = u.phone_number,
    up.membership_number = u.membership_number,
    up.membership_type = u.membership_type,
    up.membership_status = CASE 
        WHEN u.is_approved = 1 THEN 'Active'
        ELSE 'Pending'
    END,
    up.company = u.organization_name,
    up.job_title = u.organization_affiliation,
    up.updated_at = NOW()
WHERE u.phone_number IS NOT NULL OR u.membership_number IS NOT NULL OR u.membership_type IS NOT NULL;
