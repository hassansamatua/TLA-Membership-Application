-- Fix membership status for user ID 2 (HASSANI SAID SAMATUla)
UPDATE user_profiles 
SET membership_status = 'active', updated_at = NOW() 
WHERE user_id = 2;

-- Verify the update
SELECT membership_status, updated_at 
FROM user_profiles 
WHERE user_id = 2;
