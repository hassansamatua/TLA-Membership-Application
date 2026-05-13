-- Fix membership numbers in memberships table from MEM to TLA format

-- Update memberships table  
UPDATE memberships 
SET membership_number = REPLACE(membership_number, 'MEM', 'TLA') 
WHERE membership_number LIKE 'MEM%';

-- Verify the update
SELECT user_id, membership_number, status, payment_status 
FROM memberships 
WHERE membership_number LIKE 'TLA%' 
ORDER BY user_id;
