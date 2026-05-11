import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  let connection;
  try {
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

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

    // Get footer settings from database
    const [settingsData] = await connection.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value FROM site_settings WHERE setting_group = "footer" ORDER BY setting_key'
    );

    const footerSettings: any = {};
    settingsData.forEach((setting: any) => {
      if (setting.setting_key.includes('links') || setting.setting_key.includes('sections')) {
        try {
          footerSettings[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch {
          footerSettings[setting.setting_key] = setting.setting_value;
        }
      } else {
        footerSettings[setting.setting_key] = setting.setting_value;
      }
    });

    return NextResponse.json(footerSettings);
  } catch (error) {
    console.error('Error fetching footer settings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch footer settings' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(request: Request) {
  let connection;
  try {
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('token')?.value;
    const token = authToken || cookieToken;

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

    const body = await request.json();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update each footer setting
      for (const [key, value] of Object.entries(body)) {
        let settingValue = value;
        
        if (typeof value === 'object' && value !== null) {
          settingValue = JSON.stringify(value);
        }

        await connection.query(
          `INSERT INTO site_settings (setting_key, setting_value, setting_type, setting_group, updated_at) 
           VALUES (?, ?, ?, 'footer', NOW()) 
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
          [key, settingValue, typeof value === 'object' ? 'json' : 'string']
        );
      }

      await connection.commit();

      return NextResponse.json({
        message: 'Footer settings updated successfully',
        settings: body
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating footer settings:', error);
    return NextResponse.json(
      { message: 'Failed to update footer settings' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
