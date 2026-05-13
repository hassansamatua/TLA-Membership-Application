-- Add target_cycle_year + cycle_count to payments so the checkout route can
-- persist multi-cycle prepayments and the callback can mark them correctly
-- when AzamPay returns asynchronously.
SET @has_target := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'payments'
     AND COLUMN_NAME = 'target_cycle_year'
);
SET @stmt := IF(@has_target = 0,
  'ALTER TABLE payments ADD COLUMN target_cycle_year INT(11) NULL AFTER cycle_year',
  'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_count := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'payments'
     AND COLUMN_NAME = 'cycle_count'
);
SET @stmt := IF(@has_count = 0,
  'ALTER TABLE payments ADD COLUMN cycle_count TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER target_cycle_year',
  'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- Confirm
SELECT COLUMN_NAME, COLUMN_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'payments'
   AND COLUMN_NAME IN ('target_cycle_year', 'cycle_count');
