-- Check the current status of najua@gmail.com user
SELECT 'Najua User Status' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved, 
  membership_number,
  created_at
FROM users 
WHERE email = 'najua@gmail.com';

-- Check all users with their approval status
SELECT 'All Users Status' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved,
  CASE 
    WHEN is_admin = 1 THEN 'admin'
    WHEN is_approved = 0 THEN 'pending'
    ELSE 'approved'
  END as user_status
FROM users 
ORDER BY created_at DESC;
