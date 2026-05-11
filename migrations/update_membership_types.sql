-- Update existing membership data to use new types
-- This migration converts old membership types to the new personal/organization system

-- Update existing memberships table if it has old enum values
ALTER TABLE memberships 
MODIFY COLUMN membership_type ENUM('personal', 'organization') NOT NULL;

-- Update existing payments table if it has old enum values  
ALTER TABLE payments 
MODIFY COLUMN membership_type ENUM('personal', 'organization') NOT NULL;

-- Convert old membership types to new ones
UPDATE memberships SET membership_type = 'personal' 
WHERE membership_type IN ('student', 'individual', 'lifetime', 'honorary');

UPDATE memberships SET membership_type = 'organization' 
WHERE membership_type = 'institutional';

-- Convert old payment types to new ones
UPDATE payments SET membership_type = 'personal' 
WHERE membership_type IN ('student', 'individual', 'lifetime', 'honorary');

UPDATE payments SET membership_type = 'organization' 
WHERE membership_type = 'institutional';

-- Update any JSON membership info in users table
UPDATE users SET 
membership_info = JSON_SET(
  JSON_SET(membership_info, '$.membership.membershipType', 
    CASE 
      WHEN JSON_UNQUOTE(JSON_EXTRACT(membership_info, '$.membership.membershipType')) IN ('student', 'individual', 'lifetime', 'honorary') 
      THEN 'personal'
      WHEN JSON_UNQUOTE(JSON_EXTRACT(membership_info, '$.membership.membershipType')) = 'institutional' 
      THEN 'organization'
      ELSE JSON_UNQUOTE(JSON_EXTRACT(membership_info, '$.membership.membershipType'))
    END
  ),
  '$.membership.membershipStatus', 
    CASE 
      WHEN JSON_UNQUOTE(JSON_EXTRACT(membership_info, '$.membership.membershipStatus')) IN ('student', 'individual', 'lifetime', 'honorary') 
      THEN 'personal'
      WHEN JSON_UNQUOTE(JSON_EXTRACT(membership_info, '$.membership.membershipStatus')) = 'institutional' 
      THEN 'organization'
      ELSE JSON_UNQUOTE(JSON_EXTRACT(membership_info, '$.membership.membershipStatus'))
    END
)
WHERE membership_info IS NOT NULL 
AND JSON_EXTRACT(membership_info, '$.membership.membershipType') IS NOT NULL;
