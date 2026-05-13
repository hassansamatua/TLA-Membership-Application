-- Repair payments table: assign IDs to rows with id=0, then add PK + AUTO_INCREMENT

-- 1) Backfill ids for broken rows (id=0). Use a session variable to renumber.
SET @next_id := (SELECT IFNULL(MAX(id),0) FROM payments);

UPDATE payments
SET id = (@next_id := @next_id + 1)
WHERE id = 0 OR id IS NULL
ORDER BY created_at, reference;

-- 2) Add PRIMARY KEY (will fail if duplicate ids exist – the step above prevents that).
ALTER TABLE payments
  MODIFY id INT NOT NULL,
  ADD PRIMARY KEY (id);

-- 3) Make id AUTO_INCREMENT so future inserts work.
ALTER TABLE payments
  MODIFY id INT NOT NULL AUTO_INCREMENT;

-- 4) Helpful indexes (idempotent: ignore errors if already exist).
ALTER TABLE payments ADD UNIQUE KEY uq_payments_reference (reference);
ALTER TABLE payments ADD KEY idx_payments_user_id (user_id);
ALTER TABLE payments ADD KEY idx_payments_status (status);
ALTER TABLE payments ADD KEY idx_payments_created_at (created_at);
