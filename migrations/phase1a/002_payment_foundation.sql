-- Phase 1A canonical payment foundation
-- Apply only in a dedicated disposable test database.

CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference` VARCHAR(100) NOT NULL,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `user_id` INT NOT NULL,
  `provider_code` VARCHAR(50) NOT NULL,
  `kind` ENUM('SEPARATE','COMBINED') NOT NULL,
  `status` ENUM('PENDING','PROCESSING','VERIFICATION_REQUIRED','SUCCESS','FAILED','CANCELLED','EXPIRED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'TZS',
  `provider_reference` VARCHAR(150) NULL,
  `provider_transaction_id` VARCHAR(150) NULL,
  `checkout_url` TEXT NULL,
  `expires_at` DATETIME NULL,
  `succeeded_at` DATETIME NULL,
  `failed_at` DATETIME NULL,
  `cancelled_at` DATETIME NULL,
  `expired_at` DATETIME NULL,
  `refunded_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_payment_reference` (`reference`),
  UNIQUE KEY `uq_payment_idempotency` (`user_id`,`idempotency_key`),
  UNIQUE KEY `uq_payment_provider_reference` (`provider_code`,`provider_reference`),
  UNIQUE KEY `uq_payment_provider_transaction` (`provider_code`,`provider_transaction_id`),
  KEY `idx_payment_user` (`user_id`),
  KEY `idx_payment_status` (`status`),
  CONSTRAINT `fk_payment_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_cycle_allocations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NOT NULL,
  `cycle_year` INT NOT NULL,
  `base_amount` DECIMAL(12,2) NOT NULL,
  `penalty_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('ALLOCATED','PAID','REFUNDED','CANCELLED') NOT NULL DEFAULT 'ALLOCATED',
  `paid_at` DATETIME NULL,
  `refunded_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_payment_allocation_cycle` (`payment_id`,`cycle_year`),
  KEY `idx_allocation_payment` (`payment_id`),
  KEY `idx_allocation_status` (`status`),
  CONSTRAINT `fk_payment_allocation_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `membership_cycle_entitlements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_allocation_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `cycle_year` INT NOT NULL,
  `entitlement_status` ENUM('active','reversed') NOT NULL,
  `granted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` DATETIME NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_entitlement_user_cycle` (`user_id`,`cycle_year`),
  UNIQUE KEY `uq_entitlement_allocation` (`payment_allocation_id`),
  CONSTRAINT `fk_entitlement_allocation` FOREIGN KEY (`payment_allocation_id`) REFERENCES `payment_cycle_allocations` (`id`),
  CONSTRAINT `fk_entitlement_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NOT NULL,
  `provider_event_id` VARCHAR(150) NOT NULL,
  `payload_hash` CHAR(64) NOT NULL,
  `processed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_notification_event` (`payment_id`,`provider_event_id`),
  CONSTRAINT `fk_notification_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_refunds` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NOT NULL,
  `refund_reference` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `status` ENUM('PENDING','CONFIRMED','REJECTED','FAILED') NOT NULL DEFAULT 'PENDING',
  `requested_by` INT NOT NULL,
  `provider_refund_reference` VARCHAR(150) NULL,
  `evidence_hash` CHAR(64) NULL,
  `confirmed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_refund_reference` (`refund_reference`),
  UNIQUE KEY `uq_provider_refund_reference` (`provider_refund_reference`),
  KEY `idx_refund_payment` (`payment_id`),
  CONSTRAINT `fk_refund_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`),
  CONSTRAINT `fk_refund_actor` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_refund_allocations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `refund_id` INT NOT NULL,
  `payment_allocation_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_refund_allocation` (`refund_id`,`payment_allocation_id`),
  CONSTRAINT `fk_refund_allocation_refund` FOREIGN KEY (`refund_id`) REFERENCES `payment_refunds` (`id`),
  CONSTRAINT `fk_refund_allocation_payment` FOREIGN KEY (`payment_allocation_id`) REFERENCES `payment_cycle_allocations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_audit_events` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NULL,
  `event_type` VARCHAR(80) NOT NULL,
  `actor_type` VARCHAR(30) NOT NULL,
  `actor_id` INT NULL,
  `event_hash` CHAR(64) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_audit_payment` (`payment_id`),
  KEY `idx_audit_type` (`event_type`),
  CONSTRAINT `fk_audit_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
