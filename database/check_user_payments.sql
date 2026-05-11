-- Check payment records for user ID 0
SELECT 
  p.*,
  u.name as user_name,
  u.email as user_email
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
WHERE p.user_id = 0
ORDER BY p.created_at DESC;

-- Also check if payments table exists and its structure
SHOW TABLES LIKE 'payments';
DESCRIBE payments;
