-- Update demographic fields in user_profiles with sample data
UPDATE `user_profiles` SET 
  `date_of_birth` = CASE 
    WHEN id % 4 = 0 THEN DATE_SUB(CURRENT_DATE, INTERVAL 25 YEAR)
    WHEN id % 4 = 1 THEN DATE_SUB(CURRENT_DATE, INTERVAL 30 YEAR)
    WHEN id % 4 = 2 THEN DATE_SUB(CURRENT_DATE, INTERVAL 35 YEAR)
    ELSE DATE_SUB(CURRENT_DATE, INTERVAL 28 YEAR)
  END,
  `gender` = CASE 
    WHEN id % 3 = 0 THEN 'Male'
    WHEN id % 3 = 1 THEN 'Female'
    ELSE 'Other'
  END,
  `nationality` = 'Kenyan',
  `updated_at` = NOW();
