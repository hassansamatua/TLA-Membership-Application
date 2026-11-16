-- Phase 1A isolated member schema alignment
-- Apply only in the dedicated disposable Phase 1A database.

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `user_category` ENUM('librarian','organization','regular') NOT NULL DEFAULT 'regular' AFTER `email`;

CREATE INDEX IF NOT EXISTS `idx_users_category` ON `users` (`user_category`);

CREATE TABLE IF NOT EXISTS `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sender_id` INT NOT NULL,
  `receiver_id` INT NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `read_at` TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_messages_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_messages_sender` (`sender_id`),
  INDEX `idx_messages_receiver` (`receiver_id`),
  INDEX `idx_messages_created` (`created_at`),
  INDEX `idx_messages_read` (`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
