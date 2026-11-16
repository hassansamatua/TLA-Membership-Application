-- Phase 1C payment lifecycle recovery and reconciliation
-- Disposable phase1a_test only.

ALTER TABLE `payment_transactions`
  MODIFY `status` ENUM('PENDING','PROCESSING','VERIFICATION_REQUIRED','SUCCESS','FAILED','CANCELLED','EXPIRED','REFUNDED','RECONCILIATION_REQUIRED') NOT NULL DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS `payment_initiation_attempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NOT NULL,
  `attempt_key` VARCHAR(128) NOT NULL,
  `status` ENUM('REQUESTED','PENDING_PROVIDER','OUTCOME_UNKNOWN','PROVIDER_ACCEPTED','DEFINITE_REJECTION','RECONCILIATION_REQUIRED','COMPLETED') NOT NULL,
  `provider_reference` VARCHAR(150) NULL,
  `claim_owner` VARCHAR(64) NULL,
  `claimed_at` DATETIME NULL,
  `lease_expires_at` DATETIME NULL,
  `retry_count` INT NOT NULL DEFAULT 0,
  `last_operation` VARCHAR(80) NULL,
  `last_error` VARCHAR(500) NULL,
  `provider_outcome` VARCHAR(80) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_initiation_payment` (`payment_id`),
  UNIQUE KEY `uq_initiation_key` (`payment_id`,`attempt_key`),
  KEY `idx_initiation_status_lease` (`status`,`lease_expires_at`),
  CONSTRAINT `fk_initiation_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_reconciliation_cases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NOT NULL,
  `case_type` VARCHAR(80) NOT NULL,
  `status` ENUM('OPEN','RESOLVED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  `provider_reference` VARCHAR(150) NULL,
  `provider_transaction_id` VARCHAR(150) NULL,
  `evidence` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` DATETIME NULL,
  UNIQUE KEY `uq_reconciliation_payment_type` (`payment_id`,`case_type`),
  KEY `idx_reconciliation_status` (`status`),
  CONSTRAINT `fk_reconciliation_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `payment_refund_requests`
  ADD COLUMN IF NOT EXISTS `claim_owner` VARCHAR(64) NULL AFTER `provider_refund_reference`,
  ADD COLUMN IF NOT EXISTS `claimed_at` DATETIME NULL AFTER `claim_owner`,
  ADD COLUMN IF NOT EXISTS `lease_expires_at` DATETIME NULL AFTER `claimed_at`,
  ADD COLUMN IF NOT EXISTS `retry_count` INT NOT NULL DEFAULT 0 AFTER `lease_expires_at`,
  ADD COLUMN IF NOT EXISTS `last_operation` VARCHAR(80) NULL AFTER `retry_count`,
  ADD COLUMN IF NOT EXISTS `last_error` VARCHAR(500) NULL AFTER `last_operation`;

ALTER TABLE `payment_refund_requests`
  ADD INDEX IF NOT EXISTS `idx_refund_status_lease` (`status`,`lease_expires_at`);
