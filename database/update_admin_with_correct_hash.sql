-- Update admin users with the correct bcrypt hash for "admin123"
-- Generated hash: $2b$10$GnKq4XXAwxiYdh0GG3ARNuTJs97.3rhvEMriGYJyP8o1r02UmoaF2

-- Update the first admin user (admin@example.com)
UPDATE users 
SET password = '$2b$10$GnKq4XXAwxiYdh0GG3ARNuTJs97.3rhvEMriGYJyP8o1r02UmoaF2'
WHERE email = 'admin@example.com';

-- Update the second admin user (admin@tla.com) 
UPDATE users 
SET password = '$2b$10$GnKq4XXAwxiYdh0GG3ARNuTJs97.3rhvEMriGYJyP8o1r02UmoaF2'
WHERE email = 'admin@tla.com';

-- Verify the password update
SELECT 'Admin Passwords Updated with Correct Hash' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved,
  LEFT(password, 20) as password_hash_start
FROM users 
WHERE email IN ('admin@example.com', 'admin@tla.com');
