-- Check all payment records and total amounts
SELECT 
  COUNT(*) as total_payments,
  SUM(amount) as total_amount,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_payment,
  MAX(created_at) as last_payment
FROM payments;

-- Show individual payment records
SELECT 
  p.id,
  p.user_id,
  u.name as user_name,
  u.email as user_email,
  p.amount,
  p.currency,
  p.status,
  p.membership_type,
  p.created_at,
  p.paid_at
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 10;
