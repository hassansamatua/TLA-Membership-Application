-- Universal schema repair: assign IDs to rows with id=0/NULL, then add PRIMARY KEY + AUTO_INCREMENT.
-- Run idempotently. Each block is independent.

-- ============================================================
-- membership_payments
-- ============================================================
SET @next_id := (SELECT IFNULL(MAX(id),0) FROM membership_payments);
UPDATE membership_payments SET id = (@next_id := @next_id + 1) WHERE id = 0 OR id IS NULL ORDER BY created_at, user_id;
ALTER TABLE membership_payments MODIFY id INT NOT NULL, ADD PRIMARY KEY (id);
ALTER TABLE membership_payments MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE membership_payments ADD KEY idx_mp_user_id (user_id);
ALTER TABLE membership_payments ADD KEY idx_mp_reference (reference);
ALTER TABLE membership_payments ADD KEY idx_mp_cycle (cycle_year);

-- ============================================================
-- cycle_payment_status
-- ============================================================
SET @next_id := (SELECT IFNULL(MAX(id),0) FROM cycle_payment_status);
UPDATE cycle_payment_status SET id = (@next_id := @next_id + 1) WHERE id = 0 OR id IS NULL ORDER BY created_at, user_id, cycle_year;
ALTER TABLE cycle_payment_status MODIFY id INT NOT NULL, ADD PRIMARY KEY (id);
ALTER TABLE cycle_payment_status MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE cycle_payment_status ADD UNIQUE KEY uq_cps_user_cycle (user_id, cycle_year);

-- ============================================================
-- user_membership_status
-- ============================================================
SET @next_id := (SELECT IFNULL(MAX(id),0) FROM user_membership_status);
UPDATE user_membership_status SET id = (@next_id := @next_id + 1) WHERE id = 0 OR id IS NULL ORDER BY created_at, user_id;
ALTER TABLE user_membership_status MODIFY id INT NOT NULL, ADD PRIMARY KEY (id);
ALTER TABLE user_membership_status MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE user_membership_status ADD UNIQUE KEY uq_ums_user_id (user_id);

-- ============================================================
-- membership_cycles (1 row per cycle_year usually)
-- ============================================================
SET @next_id := (SELECT IFNULL(MAX(id),0) FROM membership_cycles);
UPDATE membership_cycles SET id = (@next_id := @next_id + 1) WHERE id = 0 OR id IS NULL ORDER BY cycle_year;
ALTER TABLE membership_cycles MODIFY id INT NOT NULL, ADD PRIMARY KEY (id);
ALTER TABLE membership_cycles MODIFY id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE membership_cycles ADD UNIQUE KEY uq_mc_cycle_year (cycle_year);
