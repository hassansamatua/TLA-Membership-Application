-- Create messages table for TLA messaging system
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender_id (sender_id),
  INDEX idx_receiver_id (receiver_id),
  INDEX idx_created_at (created_at),
  INDEX idx_read_at (read_at)
);

-- Add indexes for better performance
ALTER TABLE messages 
ADD INDEX IF NOT EXISTS idx_sender_created (sender_id, created_at),
ADD INDEX IF NOT EXISTS idx_receiver_created (receiver_id, created_at);
