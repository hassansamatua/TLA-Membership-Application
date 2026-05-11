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

    // Get all settings from database
    const [settingsData] = await connection.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value, setting_type, setting_group, description, is_public FROM site_settings ORDER BY setting_group, setting_key'
    );

    // Convert settings array to object
    const settings: any = {};
    settingsData.forEach((setting: any) => {
      if (setting.setting_type === 'json' || setting.setting_type === 'array') {
        try {
          settings[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch {
          settings[setting.setting_key] = setting.setting_value;
        }
      } else if (setting.setting_type === 'boolean') {
        settings[setting.setting_key] = setting.setting_value === '1' || setting.setting_value === true;
      } else if (setting.setting_type === 'number') {
        settings[setting.setting_key] = Number(setting.setting_value);
      } else {
        settings[setting.setting_key] = setting.setting_value;
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching content settings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch content settings' },
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
      // Update each setting
      for (const [key, value] of Object.entries(body)) {
        let settingType = 'string';
        let settingValue = value;

        // Determine setting type based on value
        if (typeof value === 'boolean') {
          settingType = 'boolean';
          settingValue = value ? '1' : '0';
        } else if (typeof value === 'number') {
          settingType = 'number';
          settingValue = value.toString();
        } else if (typeof value === 'object' && value !== null) {
          settingType = 'json';
          settingValue = JSON.stringify(value);
        } else if (Array.isArray(value)) {
          settingType = 'array';
          settingValue = JSON.stringify(value);
        }

        // Update or insert setting
        await connection.query(
          `INSERT INTO site_settings (setting_key, setting_value, setting_type, setting_group, updated_at) 
           VALUES (?, ?, ?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type), updated_at = NOW()`,
          [key, settingValue, settingType, getSettingGroup(key)]
        );
      }

      await connection.commit();

      return NextResponse.json({
        message: 'Content settings updated successfully',
        settings: body
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating content settings:', error);
    return NextResponse.json(
      { message: 'Failed to update content settings' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

function getSettingGroup(key: string): string {
  if (key.includes('seo') || key.includes('meta')) return 'seo';
  if (key.includes('theme') || key.includes('color') || key.includes('font')) return 'theme';
  if (key.includes('footer')) return 'footer';
  if (key.includes('membership')) return 'membership';
  if (key.includes('social') || key.includes('contact')) return 'general';
  return 'general';
}
