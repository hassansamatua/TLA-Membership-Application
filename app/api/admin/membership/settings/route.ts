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

    // Get membership settings - could be from a settings table or return default settings
    const settings = {
      membershipTypes: ['personal', 'organization'],
      defaultDuration: '1 year',
      renewalReminder: '30 days',
      autoRenewal: false,
      fees: {
        personal: 50000,
        organization: 100000
      }
    };

    // You could also fetch from a settings table if it exists
    // const [settingsData] = await connection.query('SELECT * FROM membership_settings WHERE id = 1');
    // if (settingsData.length > 0) {
    //   settings = { ...settings, ...settingsData[0] };
    // }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching membership settings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch membership settings' },
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
    const { membershipTypes, defaultDuration, renewalReminder, autoRenewal, fees } = body;

    connection = await pool.getConnection();

    // Update settings in database (you might need to create a settings table)
    // await connection.query(
    //   'UPDATE membership_settings SET membership_types = ?, default_duration = ?, renewal_reminder = ?, auto_renewal = ?, fees = ? WHERE id = 1',
    //   [JSON.stringify(membershipTypes), defaultDuration, renewalReminder, autoRenewal, JSON.stringify(fees)]
    // );

    const updatedSettings = {
      membershipTypes: membershipTypes || ['personal', 'organization'],
      defaultDuration: defaultDuration || '1 year',
      renewalReminder: renewalReminder || '30 days',
      autoRenewal: autoRenewal || false,
      fees: fees || {
        personal: 50000,
        organization: 100000
      }
    };

    return NextResponse.json({
      message: 'Membership settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Error updating membership settings:', error);
    return NextResponse.json(
      { message: 'Failed to update membership settings' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
