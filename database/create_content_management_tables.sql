-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS home_content;
DROP TABLE IF EXISTS about_content;
DROP TABLE IF EXISTS contact_content;
DROP TABLE IF EXISTS footer_content;
DROP TABLE IF EXISTS navbar_content;

-- Create home content table
CREATE TABLE IF NOT EXISTS home_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(100) NOT NULL UNIQUE,
  section_type ENUM('heading', 'subheading', 'text', 'list_item', 'image') NOT NULL,
  content TEXT NOT NULL,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section_key (section_key),
  INDEX idx_order_index (order_index)
);

-- Create about us content table
CREATE TABLE IF NOT EXISTS about_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(100) NOT NULL UNIQUE,
  section_type ENUM('heading', 'subheading', 'text', 'list_item', 'image', 'mission', 'vision', 'values') NOT NULL,
  content TEXT NOT NULL,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section_key (section_key),
  INDEX idx_order_index (order_index)
);

-- Create contact content table
CREATE TABLE IF NOT EXISTS contact_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(100) NOT NULL UNIQUE,
  section_type ENUM('heading', 'text', 'email', 'phone', 'address', 'map_url', 'social_link') NOT NULL,
  content TEXT NOT NULL,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section_key (section_key),
  INDEX idx_order_index (order_index)
);

-- Create footer content table
CREATE TABLE IF NOT EXISTS footer_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(100) NOT NULL UNIQUE,
  section_type ENUM('heading', 'text', 'link', 'copyright', 'social_link', 'contact_info') NOT NULL,
  content TEXT NOT NULL,
  url VARCHAR(500),
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section_key (section_key),
  INDEX idx_order_index (order_index)
);

-- Create navbar content table
CREATE TABLE IF NOT EXISTS navbar_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(100) NOT NULL UNIQUE,
  section_type ENUM('logo', 'menu_item', 'dropdown_item', 'button') NOT NULL,
  content TEXT NOT NULL,
  url VARCHAR(500),
  parent_id INT NULL,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section_key (section_key),
  INDEX idx_parent_id (parent_id),
  INDEX idx_order_index (order_index)
);

-- Insert default home content
INSERT INTO home_content (section_key, section_type, content, order_index, is_active) VALUES
('home_main_heading', 'heading', 'Welcome to Tanzania Library Association', 1, 1),
('home_main_subheading', 'subheading', 'Empowering Knowledge, Connecting Communities', 2, 1),
('home_membership_heading', 'heading', 'Membership Benefits', 3, 1),
('home_membership_item_1', 'list_item', 'Access Books - Borrow books online and offline with easy tracking.', 4, 1),
('home_membership_item_2', 'list_item', 'Digital Resources - Access e-books, journals, and research materials 24/7.', 5, 1),
('home_membership_item_3', 'list_item', 'Community Events - Join workshops, reading clubs, and library events.', 6, 1);

-- Insert default about us content
INSERT INTO about_content (section_key, section_type, content, order_index, is_active) VALUES
('about_main_heading', 'heading', 'About Tanzania Library Association', 1, 1),
('about_description', 'text', 'The Tanzania Library Association (TLA) is the leading professional organization dedicated to advancing library and information services throughout Tanzania.', 2, 1),
('about_mission', 'mission', 'To promote library development, support information professionals, and advocate for access to knowledge for all Tanzanians.', 3, 1),
('about_vision', 'vision', 'To be the catalyst for a knowledge-driven society where every Tanzanian has access to quality information services.', 4, 1),
('about_values_1', 'values', 'Professional Excellence - Maintaining high standards in library and information services.', 5, 1),
('about_values_2', 'values', 'Community Service - Serving communities through knowledge and information access.', 6, 1),
('about_values_3', 'values', 'Innovation - Embracing technology and new approaches to information delivery.', 7, 1);

-- Insert default contact content
INSERT INTO contact_content (section_key, section_type, content, order_index, is_active) VALUES
('contact_main_heading', 'heading', 'Contact Us', 1, 1),
('contact_description', 'text', 'Get in touch with us for any inquiries about membership, services, or partnerships.', 2, 1),
('contact_email', 'email', 'info@tla.or.tz', 3, 1),
('contact_phone', 'phone', '+255 22 211 1234', 4, 1),
('contact_address', 'address', 'Dar es Salaam, Tanzania', 5, 1);

-- Insert default footer content
INSERT INTO footer_content (section_key, section_type, content, url, order_index, is_active) VALUES
('footer_about_heading', 'heading', 'About TLA', NULL, 1, 1),
('footer_about_text', 'text', 'Tanzania Library Association is dedicated to promoting library services, supporting professionals, and advocating for access to knowledge throughout Tanzania.', NULL, 2, 1),
('footer_quick_links_heading', 'heading', 'Quick Links', NULL, 3, 1),
('footer_link_about', 'link', 'About Us', '/about-us', 4, 1),
('footer_link_contact', 'link', 'Contact', '/contact', 5, 1),
('footer_link_membership', 'link', 'Membership', '/membership', 6, 1),
('footer_link_events', 'link', 'Events', '/events', 7, 1),
('footer_contact_heading', 'heading', 'Contact', NULL, 8, 1),
('footer_contact_email', 'contact_info', 'Email: info@tla.or.tz', NULL, 9, 1),
('footer_contact_phone', 'contact_info', 'Phone: +255 XXX XXX XXX', NULL, 10, 1),
('footer_contact_address', 'contact_info', 'Address: Dar es Salaam, Tanzania', NULL, 11, 1),
('footer_copyright', 'copyright', '© 2026 Tanzania Library Association (TLA). All rights reserved.', NULL, 12, 1);

-- Insert default navbar content
INSERT INTO navbar_content (section_key, section_type, content, url, order_index, parent_id, is_active) VALUES
('navbar_logo', 'logo', 'TLA', '/', 1, NULL, 1),
('navbar_menu_home', 'menu_item', 'Home', '/', 2, NULL, 1),
('navbar_menu_about', 'menu_item', 'About Us', '/about-us', 3, NULL, 1),
('navbar_menu_membership', 'menu_item', 'Membership', '/membership', 4, NULL, 1),
('navbar_menu_events', 'menu_item', 'Events', '/events', 5, NULL, 1),
('navbar_menu_contact', 'menu_item', 'Contact', '/contact', 6, NULL, 1),
('navbar_menu_resources', 'menu_item', 'Resources', '/resources', 7, NULL, 1),
('navbar_login_button', 'button', 'Login', '/auth/login', 8, NULL, 1);
