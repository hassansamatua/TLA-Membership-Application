-- Quick fix for payments table structure
-- Run this if you're getting column errors

-- Drop and recreate payments table with correct structure
DROP TABLE IF EXISTS payments;

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(100) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  membership_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TZS',
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  checkout_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_reference (reference),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
