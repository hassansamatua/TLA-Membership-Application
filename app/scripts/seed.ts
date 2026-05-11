// scripts/seed.ts
import { pool } from '../lib/db';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const [rows] = await pool.execute(
    `INSERT INTO users (name, email, password, is_admin, is_approved, created_at)
     VALUES (?, ?, ?, TRUE, TRUE, NOW())
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    ['Admin User', 'admin@example.com', hashedPassword]
  );

  console.log('Admin user created/updated');
}

createAdminUser().catch(console.error);