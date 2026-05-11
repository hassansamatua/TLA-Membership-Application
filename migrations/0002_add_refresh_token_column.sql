-- Add refresh_token column to users table
ALTER TABLE users 
ADD COLUMN refresh_token VARCHAR(512) NULL DEFAULT NULL,
ADD INDEX idx_refresh_token (refresh_token);
