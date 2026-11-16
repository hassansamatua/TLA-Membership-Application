-- Phase 1F integrity remediation for reconciliation lineage.
-- Disposable phase1a_test only.

SET @constraint_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA=DATABASE()
    AND TABLE_NAME='payment_reconciliation_cases'
    AND CONSTRAINT_NAME='fk_reconciliation_parent'
);
SET @sql := IF(
  @constraint_exists=0,
  'ALTER TABLE `payment_reconciliation_cases` ADD CONSTRAINT `fk_reconciliation_parent` FOREIGN KEY (`parent_case_id`) REFERENCES `payment_reconciliation_cases` (`id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
