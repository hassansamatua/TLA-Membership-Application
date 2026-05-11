-- Simplified Membership Type Update Script
-- Run these commands one by one in your MySQL client

-- 1. Backup existing data (just in case)
-- CREATE TABLE users_backup AS SELECT * FROM users;
-- CREATE TABLE payments_backup AS SELECT * FROM payments;
-- CREATE TABLE membership_payments_backup AS SELECT * FROM membership_payments;

-- 2. Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS contact_person_email VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS membership_type ENUM('librarian', 'organization', 'regular') NOT NULL DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_membership_year INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255) DEFAULT NULL;

-- 3. Update existing 'personal' memberships to 'librarian'
UPDATE users 
SET membership_type = 'librarian' 
WHERE membership_type = 'personal' OR membership_type IS NULL;

-- 4. Update membership_payments table
ALTER TABLE membership_payments
ADD COLUMN IF NOT EXISTS membership_type ENUM('librarian', 'organization', 'regular') NOT NULL DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT TRUE;

-- 5. Update payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS membership_type ENUM('librarian', 'organization', 'regular') DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT TRUE;

-- 6. Create function to calculate membership fee
DELIMITER //
CREATE FUNCTION IF NOT EXISTS calculate_membership_fee(
    p_membership_type VARCHAR(20),
    p_is_new_member BOOLEAN
) 
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_fee DECIMAL(10,2);
    
    IF p_membership_type = 'organization' THEN
        SET v_fee = 150000.00;
    ELSEIF p_membership_type = 'librarian' OR p_membership_type = 'regular' THEN
        IF p_is_new_member THEN
            SET v_fee = 40000.00;
        ELSE
            SET v_fee = 30000.00;
        END IF;
    ELSE
        SET v_fee = 40000.00;
    END IF;
    
    RETURN v_fee;
END //
DELIMITER ;

-- 7. Update membership_payments with correct amounts
UPDATE membership_payments mp
JOIN users u ON mp.user_id = u.id
SET 
    mp.membership_type = u.membership_type,
    mp.amount = calculate_membership_fee(u.membership_type, mp.is_new_member);

-- 8. Update payments with correct amounts
UPDATE payments p
JOIN users u ON p.user_id = u.id
SET 
    p.membership_type = u.membership_type,
    p.amount = calculate_membership_fee(u.membership_type, p.is_new_member);

-- 9. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_membership_type ON users(membership_type);
CREATE INDEX IF NOT EXISTS idx_payments_membership_type ON payments(membership_type);
CREATE INDEX IF NOT EXISTS idx_membership_payments_type ON membership_payments(membership_type);

-- 10. Create a view for membership fees
CREATE OR REPLACE VIEW membership_fees AS
SELECT 
    'librarian' AS membership_type,
    TRUE AS is_new_member,
    40000.00 AS fee
UNION ALL
SELECT 
    'librarian' AS membership_type,
    FALSE AS is_new_member,
    30000.00 AS fee
UNION ALL
SELECT 
    'regular' AS membership_type,
    TRUE AS is_new_member,
    40000.00 AS fee
UNION ALL
SELECT 
    'regular' AS membership_type,
    FALSE AS is_new_member,
    30000.00 AS fee
UNION ALL
SELECT 
    'organization' AS membership_type,
    TRUE AS is_new_member,
    150000.00 AS fee
UNION ALL
SELECT 
    'organization' AS membership_type,
    FALSE AS is_new_member,
    150000.00 AS fee;
