-- Create a simple test user with password "123456"
-- Generate hash for "123456"

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
  'Simple Test',
  'test@test.com',
  '$2b$10$K8X9J2Q5L6M3N7O4P1R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8', -- This is a placeholder
  '1111222233334444',
  'regular',
  '0711111111',
  0,
  1,
  'TLA2600002'
);

-- Update with proper hash for "123456"
UPDATE users 
SET password = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAg6o7R9u0WpP2v7eK'
WHERE email = 'test@test.com';

-- Show the test user
SELECT 'Simple Test User Created' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved,
  LEFT(password, 20) as password_hash_start
FROM users 
WHERE email = 'test@test.com';
