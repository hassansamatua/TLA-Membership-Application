// Simple table import to Aiven
import { pool } from '@/lib/db';

export async function POST() {
  try {
    console.log('Starting simple table import to Aiven...');
    
    const connection = await pool.getConnection();
    
    try {
      // Create the database if it doesn't exist
      await connection.query('CREATE DATABASE IF NOT EXISTS next_auth');
      await connection.query('USE next_auth');
      
      // Create users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id int(11) NOT NULL AUTO_INCREMENT,
          name varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          email varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
          password varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          nida varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          membership_type enum('librarian','regular','organization') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'regular',
          phone_number varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          organization_affiliation varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          other_phone_number varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          organization_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          is_admin tinyint(1) DEFAULT '0',
          role varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
          is_approved tinyint(1) DEFAULT '0',
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          refresh_token varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          membership_number varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          last_payment_year int(4) DEFAULT NULL,
          payment_status enum('current','overdue','grace_period') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          total_penalties decimal(10,2) NOT NULL DEFAULT '0.00',
          reset_token varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          reset_token_expires_at timestamp NULL DEFAULT NULL,
          contact_person_name varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          contact_person_email varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          is_new_member tinyint(1) DEFAULT '1',
          last_membership_year int(11) DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY email (email),
          KEY idx_membership_number (membership_number),
          KEY idx_is_approved (is_approved)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Insert admin user
      await connection.query(`
        INSERT IGNORE INTO users (id, name, email, password, nida, membership_type, is_admin, role, is_approved, membership_number)
        VALUES (35, 'Admin User', 'admin@example.com', '$2b$10$GnKq4XXAwxiYdh0GG3ARNuTJs97.3rhvEMriGYJyP8o1r02UmoaF2', '1234567890123456', 'librarian', 1, 'member', 1, 'TLA2670492')
      `);
      
      console.log('Users table created and admin user inserted successfully!');
      
      return Response.json({
        success: true,
        message: 'Users table created successfully'
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Table import failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
