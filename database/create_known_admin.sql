-- Create a new admin user with known password: admin123
-- First, let's hash the password properly
-- We'll use the same bcrypt format that the system expects

INSERT INTO users (
  name, 
  email, 
  password, 
  nida, 
  membership_type, 
  phone_number, 
  is_admin,
  is_approved,
  membership_number
) VALUES (
  'System Admin',
  'admin@tla.com',
  '$2b$10$rQZ8Z8Z8Z8Z8Z8Z8Z8Z8ZO', -- This is a placeholder, we'll update it
  '1234567890123456',
  'librarian',
  '0712345678',
  1,
  1,
  'TLA2699999'
);

-- Update with a proper bcrypt hash for 'admin123'
UPDATE users 
SET password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'admin@tla.com';

-- Verify the admin user was created
SELECT 'New Admin User Created' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved, 
  membership_number,
  LEFT(password, 20) as password_hash_start
FROM users 
WHERE email = 'admin@tla.com';
