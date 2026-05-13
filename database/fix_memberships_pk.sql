-- Repair memberships table: assign IDs, add PK + AUTO_INCREMENT, add unique on user_id

SET @next_id := (SELECT IFNULL(MAX(id),0) FROM memberships);

UPDATE memberships
SET id = (@next_id := @next_id + 1)
WHERE id = 0 OR id IS NULL
ORDER BY created_at, user_id;

ALTER TABLE memberships
  MODIFY id INT NOT NULL,
  ADD PRIMARY KEY (id);

ALTER TABLE memberships
  MODIFY id INT NOT NULL AUTO_INCREMENT;

-- Enable ON DUPLICATE KEY UPDATE keyed by user_id (one active membership row per user).
ALTER TABLE memberships ADD UNIQUE KEY uq_memberships_user_id (user_id);
ALTER TABLE memberships ADD KEY idx_memberships_status (status);
ALTER TABLE memberships ADD KEY idx_memberships_expiry (expiry_date);
