import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { message: 'Not found' },
        { status: 404 }
      );
    }

    // Hardcoded admin credentials (for development only)
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    
    // Hash the password
    const hashedPassword = await hashPassword(adminPassword);
    
    // Check if admin exists
    const [users] = await pool.query<import('@/lib/auth').User[]>(
      'SELECT * FROM users WHERE email = ?',
      [adminEmail]
    );
    
    if (users.length === 0) {
      // Create admin user if not exists
      await pool.query(
        'INSERT INTO users (name, email, password, is_admin, is_approved) VALUES (?, ?, ?, ?, ?)',
        ['Admin User', adminEmail, hashedPassword, 1, 1]
      );
      console.log('Admin user created');
    } else {
      // Update existing admin password
      await pool.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, adminEmail]
      );
      console.log('Admin password updated');
    }
    
    return NextResponse.json({
      success: true,
      email: adminEmail,
      password: adminPassword // Only for development!
    });
    
  } catch (error) {
    console.error('Error resetting admin:', error);
    return NextResponse.json(
      { message: 'Failed to reset admin' },
      { status: 500 }
    );
  }
}
