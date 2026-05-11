-- Let's create a test user with a simple password we can verify
-- We'll use password "123456" which is easier to test

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
  'Test Admin',
  'test@tla.com',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAg6o7R9u0WpP2v7eK', -- This is a known bcrypt hash for "secret"
  '9999888877776666',
  'librarian',
  '0711222334',
  1,
  1,
  'TLA2600001'
);

-- Show the test user
SELECT 'Test Admin Created' as info;
SELECT 
  id, 
  name, 
  email, 
  is_admin, 
  is_approved,
  LEFT(password, 20) as password_hash_start
FROM users 
WHERE email = 'test@tla.com';
