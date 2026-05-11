-- Check current users after code restore
SELECT 'Current Users After Restore' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved, 
  membership_number,
  created_at
FROM users 
ORDER BY id ASC;

-- Check if admin user exists
SELECT 'Admin User Check' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved,
  LEFT(password, 20) as password_hash_start
FROM users 
WHERE email = 'admin@example.com';
