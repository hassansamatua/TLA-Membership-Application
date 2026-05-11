-- Add phone_number column to payments table
ALTER TABLE payments ADD COLUMN phone_number VARCHAR(20) AFTER payment_method;

-- Add index for phone_number for better performance
CREATE INDEX idx_phone_number ON payments(phone_number);

-- Update existing records to have a default phone number (optional)
-- UPDATE payments SET phone_number = '0000000000' WHERE phone_number IS NULL;
