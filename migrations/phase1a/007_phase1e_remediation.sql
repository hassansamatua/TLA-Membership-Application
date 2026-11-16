-- Phase 1E remediation for reconciliation recurrence and authorized recovery workers.
-- Disposable phase1a_test only.

ALTER TABLE `payment_reconciliation_cases`
  ADD COLUMN IF NOT EXISTS `recurrence_index` INT NOT NULL DEFAULT 0 AFTER `case_type`,
  ADD COLUMN IF NOT EXISTS `parent_case_id` INT NULL AFTER `recurrence_index`,
  ADD COLUMN IF NOT EXISTS `evidence_history` JSON NULL AFTER `evidence`;

ALTER TABLE `payment_reconciliation_cases`
  DROP INDEX IF EXISTS `uq_reconciliation_payment_type`,
  ADD UNIQUE KEY IF NOT EXISTS `uq_reconciliation_recurrence` (`payment_id`,`case_type`,`recurrence_index`),
  ADD INDEX IF NOT EXISTS `idx_reconciliation_parent` (`parent_case_id`);

CREATE TABLE IF NOT EXISTS `payment_recovery_workers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `worker_key` VARCHAR(80) NOT NULL,
  `secret_hash` CHAR(64) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` DATETIME NULL,
  UNIQUE KEY `uq_recovery_worker_key` (`worker_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
