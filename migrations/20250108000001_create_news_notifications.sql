-- Create news/notifications table
CREATE TABLE IF NOT EXISTS `news_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT 'News/Notification title',
  `message` text NOT NULL COMMENT 'News/Notification content',
  `type` enum('news','notification','announcement','urgent') NOT NULL DEFAULT 'news' COMMENT 'Type of message',
  `target_audience` enum('all','members','admin','specific') NOT NULL DEFAULT 'all' COMMENT 'Who can see this message',
  `target_users` json DEFAULT NULL COMMENT 'Specific user IDs if target_audience is specific',
  `sender_id` int(11) NOT NULL COMMENT 'Admin who sent the message',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium' COMMENT 'Message priority',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Whether message is active',
  `expires_at` datetime DEFAULT NULL COMMENT 'When message expires',
  `sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When message was sent',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_type` (`type`),
  KEY `idx_target_audience` (`target_audience`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_sent_at` (`sent_at`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_news_notifications_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='News and notifications sent by admin';

-- Create user notification reads table to track which users have read which notifications
CREATE TABLE IF NOT EXISTS `user_notification_reads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `notification_id` int(11) NOT NULL,
  `read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When user read the notification',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_notification` (`user_id`, `notification_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_notification_id` (`notification_id`),
  CONSTRAINT `fk_user_notification_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_notification_reads_notification` FOREIGN KEY (`notification_id`) REFERENCES `news_notifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Track which users have read notifications';
