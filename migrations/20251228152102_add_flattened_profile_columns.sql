-- Add columns for flattened profile data
ALTER TABLE `user_profiles`
ADD COLUMN `personal_info` JSON DEFAULT NULL COMMENT 'Stores personal information as JSON',
ADD COLUMN `contact_info` JSON DEFAULT NULL COMMENT 'Stores contact information as JSON',
ADD COLUMN `education` JSON DEFAULT NULL COMMENT 'Stores education information as JSON',
ADD COLUMN `employment` JSON DEFAULT NULL COMMENT 'Stores employment information as JSON',
ADD COLUMN `membership_info` JSON DEFAULT NULL COMMENT 'Stores membership information as JSON';

-- Add indexes for frequently queried fields
ALTER TABLE `user_profiles`
ADD INDEX `idx_membership_status` (`membership_status`),
ADD INDEX `idx_payment_status` (`payment_status`);
