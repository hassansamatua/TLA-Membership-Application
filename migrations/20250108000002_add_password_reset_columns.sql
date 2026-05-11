-- Add password reset columns to users table
ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(255) NULL,
ADD COLUMN reset_token_expires_at TIMESTAMP NULL DEFAULT NULL;
