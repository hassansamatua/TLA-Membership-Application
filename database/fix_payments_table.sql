-- Add missing columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS reference VARCHAR(100) UNIQUE NOT NULL FIRST,
ADD COLUMN IF NOT EXISTS checkout_url TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for better performance
ALTER TABLE payments 
ADD INDEX IF NOT EXISTS idx_reference (reference),
ADD INDEX IF NOT EXISTS idx_status (status),
ADD INDEX IF NOT EXISTS idx_created_at (created_at);

-- Update existing records to have reference numbers
UPDATE payments SET reference = CONCAT('TLA-', id, '-', UNIX_TIMESTAMP()) WHERE reference IS NULL OR reference = '';
