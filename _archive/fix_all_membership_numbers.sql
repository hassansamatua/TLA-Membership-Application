-- Fix membership numbers from MEM to TLA format in ALL tables

-- Update user_profiles table
UPDATE user_profiles 
SET membership_number = REPLACE(membership_number, 'MEM', 'TLA') 
WHERE membership_number LIKE 'MEM%';

-- Update memberships table  
UPDATE memberships 
SET membership_number = REPLACE(membership_number, 'MEM', 'TLA') 
WHERE membership_number LIKE 'MEM%';

-- Update users table
UPDATE users 
SET membership_number = REPLACE(membership_number, 'MEM', 'TLA') 
WHERE membership_number LIKE 'MEM%';

-- Verify all updates
SELECT 'users' as table_name, id, membership_number 
FROM users 
WHERE membership_number LIKE 'TLA%' 
ORDER BY id

UNION ALL

SELECT 'user_profiles' as table_name, user_id, membership_number 
FROM user_profiles 
WHERE membership_number LIKE 'TLA%' 
ORDER BY user_id

UNION ALL

SELECT 'memberships' as table_name, user_id, membership_number 
FROM memberships 
WHERE membership_number LIKE 'TLA%' 
ORDER BY user_id;
