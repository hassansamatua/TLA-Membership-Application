-- Create payments table for AzamPay integration
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(100) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  membership_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TZS',
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  payment_method VARCHAR(50),
  phone_number VARCHAR(20),
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

-- Create membership sequence table for generating membership numbers
CREATE TABLE IF NOT EXISTS membership_sequence (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year VARCHAR(2) UNIQUE NOT NULL,
  last_number INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ensure memberships table exists with proper structure
CREATE TABLE IF NOT EXISTS memberships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  membership_number VARCHAR(20) UNIQUE NOT NULL,
  membership_type ENUM('personal', 'organization') NOT NULL,
  status ENUM('pending', 'active', 'expired', 'suspended') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  join_date DATE,
  expiry_date DATE,
  payment_date DATE,
  amount_paid DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_membership_number (membership_number),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_expiry_date (expiry_date)
);
