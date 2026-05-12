-- Enhanced Membership System Migration
-- Run this script to update the database with new membership categories and fee structure

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

-- Step 5: Update membership cycles with correct fees and dates
UPDATE `membership_cycles` SET 
    `base_fee` = 50000,
    `penalty_per_month` = 1000,
    `grace_period_end_month` = 3,
    `grace_period_end_day` = 31;

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS `idx_users_category` ON `users` (`user_category`);
CREATE INDEX IF NOT EXISTS `idx_user_membership_status` ON `user_membership_status` (`user_id`, `status`, `payment_status`);
CREATE INDEX IF NOT EXISTS `idx_cycle_payment_status` ON `cycle_payment_status` (`user_id`, `cycle_year`, `is_paid`);

-- Step 7: Update existing membership numbers to new format where possible
UPDATE `user_membership_status` 
SET `membership_number` = CONCAT('TLA', SUBSTRING(`current_cycle_year`, 3, 2), LPAD(`membership_number`, 5, '0'))
WHERE `membership_number` IS NOT NULL AND `membership_number` REGEXP '^[0-9]+$';

-- Step 8: Create sample data for testing
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `user_category`, `isApproved`, `isAdmin`) 
VALUES 
    ('Test Librarian', 'librarian@test.com', '$2b$12$test$hash', 'librarian', TRUE, FALSE),
    ('Test Organization', 'org@test.com', '$2b$12$test$hash', 'organization', TRUE, FALSE),
    ('Test Regular', 'regular@test.com', '$2b$12$test$hash', 'regular', TRUE, FALSE);

-- Migration completed
SELECT 'Enhanced membership system migration completed successfully' as status;
