-- Test the exact same query the API is using
SELECT 
  COUNT(*) as totalPayments,
  SUM(amount) as totalAmount,
  COUNT(DISTINCT user_id) as uniqueUsers,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedPayments,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingPayments
FROM payments;
