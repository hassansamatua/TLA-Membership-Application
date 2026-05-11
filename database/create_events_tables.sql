-- Create events table for TLA events system
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  max_attendees INT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_date (date),
  INDEX idx_created_at (created_at)
);

-- Create event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('registered', 'cancelled', 'attended') DEFAULT 'registered',
  
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_event_user (event_id, user_id),
  INDEX idx_event_id (event_id),
  INDEX idx_user_id (user_id),
  INDEX idx_registered_at (registered_at)
);

-- Add sample events for testing
INSERT INTO events (title, description, date, time, location, max_attendees, price, is_free) VALUES
('TLA Annual Conference 2026', 'Join us for the biggest library and information professionals gathering in Tanzania. Features keynote speakers, workshops, and networking opportunities.', '2026-06-15', '09:00:00', 'Julius Nyerere International Convention Centre, Dar es Salaam', 500, 50000, FALSE),
('Digital Libraries Workshop', 'Hands-on workshop on implementing digital library systems. Learn about cataloging, digitization, and user experience design.', '2026-04-20', '14:00:00', 'TLA Training Center, Dar es Salaam', 30, 15000, FALSE),
('Information Literacy Training', 'Free training session on teaching information literacy skills. Perfect for librarians and educators.', '2026-05-10', '10:00:00', 'Online via Zoom', 100, 0, TRUE),
('Library Management Software Demo', 'Live demonstration of modern library management systems. Compare features and pricing.', '2026-03-25', '15:00:00', 'TLA Office, Dar es Salaam', 25, 0, TRUE);
