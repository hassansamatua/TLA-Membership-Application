-- Add missing work-related columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS work_phone VARCHAR(255) DEFAULT NULL AFTER years_of_experience,
ADD COLUMN IF NOT EXISTS work_email VARCHAR(255) DEFAULT NULL AFTER work_phone,
ADD COLUMN IF NOT EXISTS work_address TEXT DEFAULT NULL AFTER work_email;

-- Update user 25 with work data
UPDATE user_profiles SET 
    work_phone = '0626776318',
    work_email = 'jafar@muhas.ac.tz',
    work_address = 'Muhimbili University of Health and Allied Sciences, Library Department, Dar es Salaam, Tanzania',
    updated_at = NOW()
WHERE user_id = 25;
