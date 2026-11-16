-- Phase 1B payment integrity remediation
-- Disposable phase1a_test only.

CREATE TABLE IF NOT EXISTS `payment_cycle_reservations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `cycle_year` INT NOT NULL,
  `payment_id` INT NULL,
  `status` ENUM('ACTIVE','SETTLED','RELEASED','CANCELLED','EXPIRED') NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_cycle_reservation_member_cycle` (`user_id`,`cycle_year`),
  KEY `idx_cycle_reservation_payment` (`payment_id`),
  KEY `idx_cycle_reservation_status_expiry` (`status`,`expires_at`),
  CONSTRAINT `fk_cycle_reservation_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_cycle_reservation_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_refund_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `request_key` VARCHAR(128) NOT NULL,
  `payment_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `status` ENUM('REQUESTED','PENDING_PROVIDER','PROVIDER_CONFIRMED','COMPLETED','FAILED','RECONCILIATION_REQUIRED','CANCELLED') NOT NULL,
  `requested_by` INT NOT NULL,
  `is_manual` TINYINT(1) NOT NULL DEFAULT 0,
  `manual_approval_id` VARCHAR(150) NULL,
  `evidence_hash` CHAR(64) NULL,
  `allocation_ids` JSON NOT NULL,
  `provider_refund_reference` VARCHAR(150) NULL,
  `failure_reason` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `confirmed_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  UNIQUE KEY `uq_refund_request_key` (`payment_id`,`request_key`),
  UNIQUE KEY `uq_refund_request_provider_ref` (`provider_refund_reference`),
  KEY `idx_refund_request_status` (`status`),
  CONSTRAINT `fk_refund_request_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`),
  CONSTRAINT `fk_refund_request_actor` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `payment_cycle_allocations`
  MODIFY `status` ENUM('ALLOCATED','PAID','REFUNDING','REFUNDED','CANCELLED') NOT NULL DEFAULT 'ALLOCATED';

ALTER TABLE `payment_notifications`
  ADD COLUMN IF NOT EXISTS `provider_code` VARCHAR(50) NULL AFTER `payment_id`,
  ADD INDEX IF NOT EXISTS `idx_notification_provider` (`provider_code`);

ALTER TABLE `payment_audit_events`
  ADD COLUMN IF NOT EXISTS `event_data` JSON NULL AFTER `event_hash`,
  ADD INDEX IF NOT EXISTS `idx_audit_actor` (`actor_id`);

CREATE UNIQUE INDEX IF NOT EXISTS `uq_notification_provider_event` ON `payment_notifications` (`provider_code`,`provider_event_id`);
