// Direct data pump from XAMPP to Aiven
import { pool } from '@/lib/db';

export async function POST() {
  try {
    console.log('Starting direct data pump from XAMPP to Aiven...');
    
    const connection = await pool.getConnection();
    
    try {
      // Connect to Aiven
      await connection.query('CREATE DATABASE IF NOT EXISTS next_auth');
      await connection.query('USE next_auth');
      
      // Simple table creation for users
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id int(11) NOT NULL AUTO_INCREMENT,
          name varchar(100) DEFAULT NULL,
          email varchar(100) NOT NULL,
          password varchar(255) NOT NULL,
          membership_type enum('librarian','regular','organization') NOT NULL DEFAULT 'regular',
          is_admin tinyint(1) DEFAULT '0',
          role varchar(20) NOT NULL DEFAULT 'member',
          is_approved tinyint(1) DEFAULT '0',
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Insert just the admin user manually
      await connection.query(`
        INSERT IGNORE INTO users (id, name, email, password, membership_type, is_admin, role, is_approved)
        VALUES (35, 'Admin User', 'admin@example.com', '$2b$10$GnKq4XXAwxiYdh0GG3ARNuTJs97.3rhvEMriGYJyP8o1r02UmoaF2', 'librarian', 1, 'member', 1)
      `);
      
      const [count] = await connection.query('SELECT COUNT(*) as count FROM users') as any[];
      
      return Response.json({
        success: true,
        message: 'Direct data pump completed',
        usersCreated: count[0].count
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Direct data pump failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
