-- Fix membership numbers from MEM to TLA format

-- Update user_profiles table
UPDATE user_profiles 
SET membership_number = REPLACE(membership_number, 'MEM', 'TLA') 
WHERE membership_number LIKE 'MEM%';

-- Update memberships table  
UPDATE memberships 
SET membership_number = REPLACE(membership_number, 'MEM', 'TLA') 
WHERE membership_number LIKE 'MEM%';

-- Verify the updates
SELECT 'user_profiles' as table_name, user_id, membership_number 
FROM user_profiles 
WHERE membership_number LIKE 'TLA%' 
ORDER BY user_id

UNION ALL

SELECT 'memberships' as table_name, user_id, membership_number 
FROM memberships 
WHERE membership_number LIKE 'TLA%' 
ORDER BY user_id;
