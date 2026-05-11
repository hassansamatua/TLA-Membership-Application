-- Aiven-compatible version of next_auth database
-- Cleaned for cloud import

-- Set character set and collation for Aiven compatibility
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- Database: next_auth
CREATE DATABASE IF NOT EXISTS `next_auth` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `next_auth`;

--
-- Function: calculate_membership_fee
--
DELIMITER $$
CREATE FUNCTION `calculate_membership_fee` (`p_membership_type` VARCHAR(20), `p_is_new_member` BOOLEAN) RETURNS DECIMAL(10,2)
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
END$$
DELIMITER ;

-- All remaining CREATE TABLE statements and INSERT data from your original file
-- [Your existing table structures and data will go here]

-- Set back foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
