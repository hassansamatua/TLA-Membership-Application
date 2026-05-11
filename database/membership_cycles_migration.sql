-- Membership Cycle System Migration
-- This creates the necessary tables for managing membership cycles, penalties, and user status

-- 1. Create membership_cycles table to track annual cycles (Feb 1 - Jan 31)
CREATE TABLE IF NOT EXISTS membership_cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_year INT NOT NULL UNIQUE,
    start_date DATE NOT NULL, -- Feb 1
    end_date DATE NOT NULL, -- Jan 31
    grace_period_end DATE NOT NULL, -- Apr 1 (grace period)
    penalty_start_date DATE NOT NULL, -- Apr 1 (penalties start)
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 50000, -- Base membership fee in TZS
    penalty_per_month DECIMAL(10,2) NOT NULL DEFAULT 1000, -- Penalty per month in TZS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cycle_year (cycle_year),
    INDEX idx_dates (start_date, end_date)
);

-- 2. Create user_membership_status table to track user status and cycles
CREATE TABLE IF NOT EXISTS user_membership_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    is_new_member BOOLEAN DEFAULT TRUE,
    first_membership_cycle INT NULL, -- The year user joined
    current_cycle_year INT NOT NULL,
    status ENUM('active', 'inactive', 'suspended', 'expired') DEFAULT 'active',
    payment_status ENUM('paid', 'grace_period', 'overdue', 'pending') DEFAULT 'pending',
    last_payment_date DATETIME NULL,
    next_due_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_cycle (current_cycle_year),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status)
);

-- 3. Create cycle_payment_status table to track payment status per user per cycle
CREATE TABLE IF NOT EXISTS cycle_payment_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cycle_year INT NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date DATETIME NULL,
    amount_paid DECIMAL(10,2) NULL,
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NULL,
    payment_reference VARCHAR(100) NULL,
    status ENUM('unpaid', 'grace_period', 'overdue', 'paid') DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_cycle (user_id, cycle_year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_cycle_year (cycle_year),
    INDEX idx_status (status),
    INDEX idx_paid (is_paid)
);

-- 4. Create penalty_notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS penalty_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cycle_year INT NOT NULL,
    notification_type ENUM('approval', 'grace_period_reminder', 'penalty_warning', 'overdue_notice') NOT NULL,
    sent_via ENUM('email', 'sms', 'both') DEFAULT 'email',
    sent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_cycle (user_id, cycle_year),
    INDEX idx_type (notification_type)
);

-- 5. Modify memberships table to add cycle tracking if not exists
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS cycle_year INT NULL,
ADD COLUMN IF NOT EXISTS is_new_user_cycle BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT 0;

-- 6. Modify payments table to add cycle info if not exists
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS cycle_year INT NULL,
ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(10,2) DEFAULT 0;

-- 7. Create initial cycle records for current and upcoming years
INSERT IGNORE INTO membership_cycles (cycle_year, start_date, end_date, grace_period_end, penalty_start_date, base_fee, penalty_per_month)
VALUES 
(2025, '2025-02-01', '2026-01-31', '2025-04-01', '2025-04-01', 50000, 1000),
(2026, '2026-02-01', '2027-01-31', '2026-04-01', '2026-04-01', 50000, 1000),
(2027, '2027-02-01', '2028-01-31', '2027-04-01', '2027-04-01', 50000, 1000),
(2028, '2028-02-01', '2029-01-31', '2028-04-01', '2028-04-01', 50000, 1000);
