-- Create membership payments table
CREATE TABLE IF NOT EXISTS `membership_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `payment_year` int(4) NOT NULL COMMENT 'Year for which payment is made',
  `amount` decimal(10,2) NOT NULL DEFAULT 50000.00 COMMENT 'Annual membership fee',
  `penalty_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Penalty for late payment',
  `total_amount` decimal(10,2) GENERATED ALWAYS AS (amount + penalty_amount) STORED,
  `payment_method` varchar(50) NOT NULL COMMENT 'Payment method used',
  `transaction_id` varchar(100) DEFAULT NULL COMMENT 'Transaction reference ID',
  `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When payment was made',
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'completed',
  `notes` text DEFAULT NULL COMMENT 'Additional notes about payment',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_year_payment` (`user_id`, `payment_year`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_payment_year` (`payment_year`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_date` (`payment_date`),
  CONSTRAINT `fk_membership_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Membership payment records';

-- Add payment tracking to users table
ALTER TABLE `users` 
ADD COLUMN `last_payment_year` int(4) DEFAULT NULL COMMENT 'Last year for which payment was made',
ADD COLUMN `payment_status` enum('current','overdue','grace_period') DEFAULT NULL COMMENT 'Current payment status',
ADD COLUMN `total_penalties` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Total accumulated penalties';

-- Create payment reminders table
CREATE TABLE IF NOT EXISTS `payment_reminders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `payment_year` int(4) NOT NULL,
  `reminder_type` enum('payment_due','grace_period','overdue') NOT NULL,
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email_sent` tinyint(1) NOT NULL DEFAULT 0,
  `sms_sent` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_year` (`user_id`, `payment_year`),
  KEY `idx_reminder_type` (`reminder_type`),
  KEY `idx_sent_at` (`sent_at`),
  CONSTRAINT `fk_payment_reminders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment reminder records';

-- Insert payment configuration
INSERT INTO `site_settings` (`key`, `value`, `description`, `created_at`) VALUES
('membership_fee', '50000', 'Annual membership fee in TSH', NOW()),
('penalty_fee', '10000', 'Late payment penalty per year in TSH', NOW()),
('payment_start_month', '1', 'Month when payments start (1=February)', NOW()),
('payment_end_month', '2', 'Month when grace period ends (2=March)', NOW()),
('payment_reminder_days', '7,14,30', 'Days before deadline to send reminders', NOW())
ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW();
