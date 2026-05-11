-- Update membership types and related logic
-- This script updates the database schema to support the new membership types

-- 1. First, backup the users table (safety first)
-- CREATE TABLE users_backup_before_membership_update AS SELECT * FROM users;

-- 2. Add new columns to users table if they don't exist
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

-- 4. Update the membership_payments table to include membership type
ALTER TABLE membership_payments
ADD COLUMN IF NOT EXISTS membership_type ENUM('librarian', 'organization', 'regular') NOT NULL DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT TRUE;

-- 5. Update the payments table to include membership type
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS membership_type ENUM('librarian', 'organization', 'regular') DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_new_member BOOLEAN DEFAULT TRUE;

-- 6. Create a function to calculate membership fee
DELIMITER //
CREATE OR REPLACE FUNCTION calculate_membership_fee(
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
        -- Default fee if type is not recognized
        SET v_fee = 40000.00;
    END IF;
    
    RETURN v_fee;
END //
DELIMITER ;

-- 7. Create a trigger to set membership fee when a payment is created
DELIMITER //
CREATE OR REPLACE TRIGGER before_payment_insert
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
    -- If membership type is not set, get it from users table
    IF NEW.membership_type IS NULL THEN
        SELECT membership_type, is_new_member 
        INTO NEW.membership_type, NEW.is_new_member
        FROM users 
        WHERE id = NEW.user_id;
    END IF;
    
    -- Calculate and set the amount based on membership type and status
    SET NEW.amount = calculate_membership_fee(NEW.membership_type, NEW.is_new_member);
END //
DELIMITER ;

-- 8. Update the membership_payments table with the correct amounts
UPDATE membership_payments mp
JOIN users u ON mp.user_id = u.id
SET 
    mp.membership_type = u.membership_type,
    mp.amount = calculate_membership_fee(u.membership_type, mp.is_new_member);

-- 9. Update the payments table with the correct amounts
UPDATE payments p
JOIN users u ON p.user_id = u.id
SET 
    p.membership_type = u.membership_type,
    p.amount = calculate_membership_fee(u.membership_type, p.is_new_member);

-- 10. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_membership_type ON users(membership_type);
CREATE INDEX IF NOT EXISTS idx_payments_membership_type ON payments(membership_type);
CREATE INDEX IF NOT EXISTS idx_membership_payments_type ON membership_payments(membership_type);

-- 11. Create a view for membership fees
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

-- 12. Create a stored procedure to get membership fee
DELIMITER //
CREATE OR REPLACE PROCEDURE get_membership_fee(
    IN p_user_id INT,
    OUT p_fee DECIMAL(10,2),
    OUT p_membership_type VARCHAR(20),
    OUT p_is_new_member BOOLEAN
)
BEGIN
    -- Get user's membership type and status
    SELECT 
        COALESCE(membership_type, 'regular'),
        COALESCE(is_new_member, TRUE)
    INTO p_membership_type, p_is_new_member
    FROM users 
    WHERE id = p_user_id;
    
    -- Calculate fee
    SET p_fee = calculate_membership_fee(p_membership_type, p_is_new_member);
END //
DELIMITER ;
