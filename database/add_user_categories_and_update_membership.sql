-- Add user categories and update membership system
-- Migration for enhanced membership management

-- 1. Add user_category field to users table
ALTER TABLE `users` 
ADD COLUMN `user_category` ENUM('librarian', 'organization', 'regular') NOT NULL DEFAULT 'regular' AFTER `email`;

-- 2. Update membership cycles with correct dates and fees
UPDATE `membership_cycles` SET 
    `base_fee` = CASE 
        WHEN `cycle_year` = 2025 THEN 50000
        ELSE 50000
    END,
    `penalty_per_month` = 1000,
    `grace_period_end_month` = 3,
    `grace_period_end_day` = 31;

-- 3. Create membership number sequence for TLAYYXXXXX format
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

-- 4. Initialize sequence for current year (2026)
INSERT IGNORE INTO `membership_number_sequence` (`year_prefix`, `sequence_number`, `is_used`) 
VALUES ('26', 1, FALSE);

-- 5. Update existing membership numbers to new format where possible
UPDATE `user_membership_status` 
SET `membership_number` = CONCAT('TLA', SUBSTRING(`current_cycle_year`, 3, 2), LPAD(`membership_number`, 5, '0'))
WHERE `membership_number` IS NOT NULL AND `membership_number` REGEXP '^[0-9]+$';

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS `idx_users_category` ON `users` (`user_category`);
CREATE INDEX IF NOT EXISTS `idx_user_membership_status` ON `user_membership_status` (`user_id`, `status`, `payment_status`);
CREATE INDEX IF NOT EXISTS `idx_cycle_payment_status` ON `cycle_payment_status` (`user_id`, `cycle_year`, `is_paid`);
