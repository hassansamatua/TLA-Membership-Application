-- Simple Migration Script for Enhanced Membership System
-- This script only adds the necessary columns without modifying existing ones

-- Step 1: Add user_category field to users table
ALTER TABLE `users` 
ADD COLUMN `user_category` ENUM('librarian', 'organization', 'regular') NOT NULL DEFAULT 'regular' AFTER `email`;

-- Step 2: Update existing users to have 'regular' category by default
UPDATE `users` SET `user_category` = 'regular' WHERE `user_category` IS NULL;

-- Step 3: Create membership number sequence table
CREATE TABLE IF NOT EXISTS `membership_number_sequence` (
    `id` int NOT NULL AUTO_INCREMENT,
    `year_prefix` varchar(2) NOT NULL,
    `sequence_number` int NOT NULL,
    `is_used` boolean NOT NULL DEFAULT FALSE,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_year_sequence` (`year_prefix`, `sequence_number`),
    KEY `idx_year_prefix` (`year_prefix`),
    KEY `idx_is_used` (`is_used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Initialize sequence for current year (2026)
INSERT IGNORE INTO `membership_number_sequence` (`year_prefix`, `sequence_number`, `is_used`) 
VALUES ('26', 1, FALSE);

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS `idx_users_category` ON `users` (`user_category`);
CREATE INDEX IF NOT EXISTS `idx_user_membership_status` ON `user_membership_status` (`user_id`, `status`, `payment_status`);
CREATE INDEX IF NOT EXISTS `idx_cycle_payment_status` ON `cycle_payment_status` (`user_id`, `cycle_year`, `is_paid`);

-- Migration completed
SELECT 'Simple migration completed successfully' as status;
