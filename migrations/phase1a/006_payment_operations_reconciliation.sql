-- Phase 1D payment operations and reconciliation management
-- Disposable phase1a_test only.

ALTER TABLE `payment_initiation_attempts`
  MODIFY `status` ENUM('REQUESTED','PENDING_PROVIDER','RECONCILING','OUTCOME_UNKNOWN','PROVIDER_ACCEPTED','DEFINITE_REJECTION','RECONCILIATION_REQUIRED','COMPLETED') NOT NULL,
  ADD COLUMN IF NOT EXISTS `next_attempt_at` DATETIME NULL AFTER `lease_expires_at`;

ALTER TABLE `payment_initiation_attempts`
  ADD INDEX IF NOT EXISTS `idx_initiation_recovery` (`status`,`lease_expires_at`,`next_attempt_at`,`retry_count`);

ALTER TABLE `payment_refund_requests`
  ADD COLUMN IF NOT EXISTS `next_attempt_at` DATETIME NULL AFTER `lease_expires_at`;

ALTER TABLE `payment_refund_requests`
  ADD INDEX IF NOT EXISTS `idx_refund_recovery` (`status`,`lease_expires_at`,`next_attempt_at`,`retry_count`);

ALTER TABLE `payment_reconciliation_cases`
  MODIFY `status` ENUM('OPEN','ASSIGNED','ESCALATED','RESOLVED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS `subject_type` VARCHAR(40) NOT NULL DEFAULT 'PAYMENT' AFTER `payment_id`,
  ADD COLUMN IF NOT EXISTS `subject_id` INT NULL AFTER `subject_type`,
  ADD COLUMN IF NOT EXISTS `assigned_to` INT NULL AFTER `evidence`,
  ADD COLUMN IF NOT EXISTS `assigned_at` DATETIME NULL AFTER `assigned_to`,
  ADD COLUMN IF NOT EXISTS `claim_owner` VARCHAR(64) NULL AFTER `assigned_at`,
  ADD COLUMN IF NOT EXISTS `lease_expires_at` DATETIME NULL AFTER `claim_owner`,
  ADD COLUMN IF NOT EXISTS `escalation_reason` VARCHAR(500) NULL AFTER `lease_expires_at`,
  ADD COLUMN IF NOT EXISTS `escalated_at` DATETIME NULL AFTER `escalation_reason`,
  ADD COLUMN IF NOT EXISTS `resolution_action` VARCHAR(80) NULL AFTER `escalated_at`,
  ADD COLUMN IF NOT EXISTS `resolution_reason` VARCHAR(500) NULL AFTER `resolution_action`,
  ADD COLUMN IF NOT EXISTS `resolved_by` INT NULL AFTER `resolution_reason`;

ALTER TABLE `payment_reconciliation_cases`
  ADD INDEX IF NOT EXISTS `idx_reconciliation_assignment` (`status`,`assigned_to`,`lease_expires_at`),
  ADD INDEX IF NOT EXISTS `idx_reconciliation_subject` (`subject_type`,`subject_id`);

ALTER TABLE `payment_audit_events`
  ADD COLUMN IF NOT EXISTS `correlation_id` VARCHAR(64) NULL AFTER `event_hash`;

ALTER TABLE `payment_audit_events`
  ADD INDEX IF NOT EXISTS `idx_audit_correlation` (`correlation_id`);

SET @constraint_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='payment_reconciliation_cases' AND CONSTRAINT_NAME='fk_reconciliation_assignee'
);
SET @sql := IF(@constraint_exists=0,'ALTER TABLE `payment_reconciliation_cases` ADD CONSTRAINT `fk_reconciliation_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='payment_reconciliation_cases' AND CONSTRAINT_NAME='fk_reconciliation_resolver'
);
SET @sql := IF(@constraint_exists=0,'ALTER TABLE `payment_reconciliation_cases` ADD CONSTRAINT `fk_reconciliation_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`)','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
