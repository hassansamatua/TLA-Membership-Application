-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS media;
DROP TABLE IF EXISTS site_settings;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS home_content;
DROP TABLE IF EXISTS about_content;
DROP TABLE IF EXISTS contact_content;
DROP TABLE IF EXISTS footer_content;
DROP TABLE IF EXISTS navbar_content;

-- Create pages table for content management
CREATE TABLE IF NOT EXISTS pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content LONGTEXT,
  excerpt TEXT,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  page_type ENUM('page', 'post', 'custom') DEFAULT 'page',
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  featured_image VARCHAR(500),
  template VARCHAR(100) DEFAULT 'default',
  author_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_slug (slug),
  INDEX idx_page_type (page_type)
);

-- Create media table for file management
CREATE TABLE IF NOT EXISTS media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  description TEXT,
  media_type ENUM('image', 'video', 'document', 'audio', 'other') DEFAULT 'other',
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_media_type (media_type),
  INDEX idx_uploaded_by (uploaded_by)
);

-- Create site_settings table for global configuration
CREATE TABLE IF NOT EXISTS site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value LONGTEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
  setting_group VARCHAR(50) DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key),
  INDEX idx_setting_group (setting_group)
);

-- Create menu_items table for navigation management
CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  menu_name VARCHAR(100) DEFAULT 'main',
  parent_id INT NULL,
  order_index INT DEFAULT 0,
  target ENUM('_self', '_blank') DEFAULT '_self',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu_name (menu_name),
  INDEX idx_parent_id (parent_id),
  INDEX idx_order_index (order_index)
);

-- Insert default site settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, setting_group, description, is_public) VALUES
('site_name', 'TLA Organization', 'string', 'general', 'Site name', true),
('site_description', 'Tanzania Library and Information Association', 'string', 'general', 'Site description', true),
('site_url', 'https://tla.or.tz', 'string', 'general', 'Site URL', true),
('admin_email', 'admin@tla.or.tz', 'string', 'general', 'Admin email', false),
('contact_email', 'info@tla.or.tz', 'string', 'general', 'Contact email', true),
('contact_phone', '+255 22 211 1234', 'string', 'general', 'Contact phone', true),
('contact_address', 'Dar es Salaam, Tanzania', 'string', 'general', 'Contact address', true),
('social_media', '{"facebook": "https://facebook.com/tla", "twitter": "https://twitter.com/tla", "linkedin": "https://linkedin.com/company/tla", "instagram": "https://instagram.com/tla"}', 'json', 'general', 'Social media links', true),
('seo_settings', '{"meta_title": "TLA - Tanzania Library and Information Association", "meta_description": "Official website of TLA", "keywords": "tla, library, information, association, tanzania"}', 'json', 'seo', 'SEO settings', true),
('theme_settings', '{"primary_color": "#10b981", "secondary_color": "#6b7280", "font_family": "Inter", "logo_url": "/logo.png"}', 'json', 'theme', 'Theme settings', false),
('footer_settings', '{"copyright_text": "© 2025 TLA. All rights reserved.", "show_social_links": true, "show_contact_info": true}', 'json', 'footer', 'Footer settings', true),
('membership_settings', '{"enable_registration": true, "require_approval": true, "default_membership_type": "personal", "membership_duration": "1 year"}', 'json', 'membership', 'Membership settings', false);

-- Insert default pages
INSERT INTO pages (title, slug, content, status, page_type, meta_title, meta_description) VALUES
('Home', 'home', '<h1>Welcome to TLA</h1><p>Tanzania Library and Information Association is dedicated to promoting library and information services in Tanzania.</p>', 'published', 'page', 'Home - TLA', 'Welcome to Tanzania Library and Information Association'),
('About Us', 'about-us', '<h1>About TLA</h1><p>The Tanzania Library and Information Association (TLA) is a professional organization...</p>', 'published', 'page', 'About Us - TLA', 'Learn about Tanzania Library and Information Association'),
('Contact', 'contact', '<h1>Contact Us</h1><p>Get in touch with TLA for more information...</p>', 'published', 'page', 'Contact - TLA', 'Contact Tanzania Library and Information Association'),
('Membership', 'membership', '<h1>Membership</h1><p>Join TLA and become part of our professional community...</p>', 'published', 'page', 'Membership - TLA', 'TLA Membership Information'),
('Events', 'events', '<h1>Events</h1><p>Upcoming events and activities organized by TLA...</p>', 'published', 'page', 'Events - TLA', 'TLA Events and Activities'),
('Resources', 'resources', '<h1>Resources</h1><p>Library and information resources for our members...</p>', 'published', 'page', 'Resources - TLA', 'TLA Resources and Materials');

-- Insert default menu items
INSERT INTO menu_items (title, url, menu_name, order_index) VALUES
('Home', '/', 'main', 1),
('About Us', '/about-us', 'main', 2),
('Membership', '/membership', 'main', 3),
('Events', '/events', 'main', 4),
('Resources', '/resources', 'main', 5),
('Contact', '/contact', 'main', 6);
