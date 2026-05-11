import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { message: 'Not found' },
        { status: 404 }
      );
    }

    const { name, email, password } = await request.json();
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the admin user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, is_admin, is_approved) VALUES (?, ?, ?, TRUE, TRUE)',
      [name, email, hashedPassword]
    );

    return NextResponse.json({ message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { message: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
