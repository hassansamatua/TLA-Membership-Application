-- Create membership_payments table for tracking payments and cycles
CREATE TABLE IF NOT EXISTS membership_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(100) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    cycle_year INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_cycle_year (cycle_year),
    INDEX idx_status (status),
    INDEX idx_payment_date (payment_date),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add cycle_year column to memberships table if it doesn't exist
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS cycle_year INT NOT NULL DEFAULT 0;

-- Add payment_reference and payment_method columns to memberships table if they don't exist
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL;
