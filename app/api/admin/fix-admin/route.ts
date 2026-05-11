// app/api/admin/fix-admin/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { message: 'Not found' },
        { status: 404 }
      );
    }

    const email = 'admin@example.com';
    const password = 'admin123';
    
    // Delete existing admin if exists
    await pool.query('DELETE FROM users WHERE email = ?', [email]);
    
    // Create new admin user
    const hashedPassword = await hashPassword(password);
    await pool.query(
      `INSERT INTO users (name, email, password, is_admin, is_approved, created_at, updated_at) 
       VALUES (?, ?, ?, TRUE, TRUE, NOW(), NOW())`,
      ['Admin User', email, hashedPassword]
    );

    return NextResponse.json({ 
      success: true,
      credentials: {
        email: email,
        password: password
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}