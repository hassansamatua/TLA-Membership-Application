-- Update test user with correct hash for "secret"
UPDATE users 
SET password = '$2b$10$rFOFlOy94aZ/SiFtF5UbL.Gq1qzhWQtLqDpwVfStYj5NLKmCB4Yxm'
WHERE email = 'test@test.com';

-- Show the updated test user
SELECT 'Test User Updated with Correct Hash' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved,
  LEFT(password, 20) as password_hash_start
FROM users 
WHERE email = 'test@test.com';
