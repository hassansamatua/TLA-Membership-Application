-- Phase 1B audit actor referential integrity
-- Disposable phase1a_test only.

SET @constraint_exists := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_audit_events'
    AND CONSTRAINT_NAME = 'fk_audit_actor'
);

SET @sql := IF(
  @constraint_exists = 0,
  'ALTER TABLE `payment_audit_events` ADD CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
