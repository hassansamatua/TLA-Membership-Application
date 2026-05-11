import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function POST(request: Request) {
  let connection;
  
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!decoded?.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    connection = await pool.getConnection();

    // Update existing membership records to have correct expiry dates
    await connection.execute(`
      UPDATE memberships 
      SET 
        expiry_date = CASE 
          -- If expiry date is January 21, 2027, fix it to January 31, 2027
          WHEN expiry_date = '2027-01-21 21:00:00' THEN '2027-01-31 23:59:59'
          -- If expiry date is in January 2027 but not the 31st, fix it to January 31, 2027
          WHEN YEAR(expiry_date) = 2027 AND MONTH(expiry_date) = 1 THEN '2027-01-31 23:59:59'
          -- If expiry date is invalid (1899), set it to January 31, 2027
          WHEN YEAR(expiry_date) < 1900 THEN '2027-01-31 23:59:59'
          -- Otherwise keep existing expiry date
          ELSE expiry_date
        END,
        joined_date = CASE 
          -- If joined date is invalid (NULL or 1899), set it to payment date
          WHEN joined_date IS NULL OR YEAR(joined_date) < 1900 THEN payment_date
          -- Otherwise keep existing joined date
          ELSE joined_date
        END,
        updated_at = NOW()
      WHERE 
        -- Only update records with wrong expiry dates
        (expiry_date = '2027-01-21 21:00:00' OR 
         YEAR(expiry_date) = 2027 AND MONTH(expiry_date) = 1 AND DAY(expiry_date) <> 31 OR
         YEAR(expiry_date) < 1900)
    `);

    // Update user_profiles joined_date if it's invalid
    await connection.execute(`
      UPDATE user_profiles 
      SET 
        joined_date = CASE 
          -- If joined_date is invalid, set it to user creation date
          WHEN joined_date IS NULL OR YEAR(joined_date) < 1900 THEN 
            (SELECT created_at FROM users WHERE users.id = user_profiles.id LIMIT 1)
          -- Otherwise keep existing joined date
          ELSE joined_date
        END,
        updated_at = NOW()
      WHERE 
        joined_date IS NULL OR YEAR(joined_date) < 1900
    `);

    // Get updated records for verification
    const [updatedRecords] = await connection.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        up.membership_number,
        up.joined_date as profile_joined_date,
        m.joined_date as membership_joined_date,
        m.expiry_date,
        m.payment_status,
        m.status
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN memberships m ON u.id = m.user_id
      WHERE up.membership_number IS NOT NULL
      ORDER BY u.id
    `);

    await connection.commit();

    console.log('✅ Database dates fixed successfully:', {
      updatedRecords: updatedRecords.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Membership dates fixed successfully',
      updatedRecords: updatedRecords.length,
      records: updatedRecords
    });

  } catch (error) {
    console.error('Failed to fix membership dates:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fix membership dates',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
