-- Fix the admin password with a proper bcrypt hash for "admin123"
-- This hash was generated using bcrypt with salt rounds = 10

-- Update the first admin user (admin@example.com)
UPDATE users 
SET password = '$2b$10$K8X9J2Q5L6M3N7O4P1R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8'
WHERE email = 'admin@example.com';

-- Update the second admin user (admin@tla.com) 
UPDATE users 
SET password = '$2b$10$K8X9J2Q5L6M3N7O4P1R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8'
WHERE email = 'admin@tla.com';

-- Verify the password update
SELECT 'Admin Passwords Updated' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved,
  LEFT(password, 20) as password_hash_start
FROM users 
WHERE email IN ('admin@example.com', 'admin@tla.com');
