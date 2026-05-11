-- Migration: Add work-related fields to user_profiles table
-- Date: 2025-01-15
-- Description: Add work_phone, work_email, and work_address columns

-- Add columns if they don't exist
ALTER TABLE user_profiles 
ADD COLUMN work_phone VARCHAR(255) DEFAULT NULL COMMENT 'Work phone number',
ADD COLUMN work_email VARCHAR(255) DEFAULT NULL COMMENT 'Work email address', 
ADD COLUMN work_address TEXT DEFAULT NULL COMMENT 'Work address';

-- Update existing user 25 record with work data
UPDATE user_profiles SET 
    work_phone = '0626776318',
    work_email = 'jafar@muhas.ac.tz',
    work_address = 'Muhimbili University of Health and Allied Sciences, Library Department, Dar es Salaam, Tanzania'
WHERE user_id = 25;
