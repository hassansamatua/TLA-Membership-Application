-- Insert sample profile data for all existing users
INSERT INTO `user_profiles` (
  `user_id`, 
  `phone`, 
  `address`, 
  `city`, 
  `state`, 
  `country`, 
  `postal_code`,
  `bio`,
  `company`,
  `job_title`,
  `membership_number`,
  `membership_type`,
  `membership_status`,
  `membership_expiry`,
  `join_date`,
  `created_at`,
  `updated_at`
) 
SELECT 
  u.id,
  CONCAT('+254', FLOOR(RAND() * 900000000 + 100000000)) as phone,
  CONCAT('Address ', u.id) as address,
  CASE WHEN u.id % 3 = 0 THEN 'Nairobi' WHEN u.id % 3 = 1 THEN 'Mombasa' ELSE 'Kisumu' END as city,
  CASE WHEN u.id % 3 = 0 THEN 'Nairobi County' WHEN u.id % 3 = 1 THEN 'Mombasa County' ELSE 'Kisumu County' END as state,
  'Kenya' as country,
  CONCAT('00', LPAD(u.id, 4, '0')) as postal_code,
  CONCAT('Professional bio for user ', u.name, '. Experienced in technology and innovation.') as bio,
  CASE WHEN u.id % 2 = 0 THEN 'Tech Solutions Ltd' WHEN u.id % 3 = 0 THEN 'Innovation Hub' ELSE 'Digital Services Inc' END as company,
  CASE WHEN u.id % 2 = 0 THEN 'Software Developer' WHEN u.id % 3 = 0 THEN 'Project Manager' ELSE 'Data Analyst' END as job_title,
  CONCAT('MEM', LPAD(u.id, 6, '0')) as membership_number,
  CASE WHEN u.is_admin = 1 THEN 'Premium' ELSE 'Standard' END as membership_type,
  CASE WHEN u.is_approved = 1 THEN 'Active' ELSE 'Pending' END as membership_status,
  DATE_ADD(CURRENT_DATE, INTERVAL 1 YEAR) as membership_expiry,
  u.created_at as join_date,
  NOW() as created_at,
  NOW() as updated_at
FROM `users` u
WHERE NOT EXISTS (
  SELECT 1 FROM `user_profiles` up WHERE up.user_id = u.id
);
