import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get or create sequence for current year
    const year = new Date().getFullYear().toString().slice(-2);
    const [rows] = await connection.query(
      'SELECT last_number FROM membership_sequence WHERE year = ? FOR UPDATE',
      [year]
    );

    let nextNumber: number;
    
    if (rows.length === 0) {
      // First number for this year
      nextNumber = 1;
      await connection.query(
        'INSERT INTO membership_sequence (year, last_number) VALUES (?, ?)',
        [year, nextNumber]
      );
    } else {
      // Increment last number
      nextNumber = rows[0].last_number + 1;
      await connection.query(
        'UPDATE membership_sequence SET last_number = ? WHERE year = ?',
        [nextNumber, year]
      );
    }

    await connection.commit();
    
    // Format as MEMyyXXXXX (5 digits minimum)
    const formattedNumber = `MEM${year}${nextNumber.toString().padStart(5, '0')}`;
    
    return NextResponse.json({ 
      success: true, 
      membershipNumber: formattedNumber 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error generating membership number:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate membership number' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}