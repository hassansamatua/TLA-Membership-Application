// app/api/admin/users/[id]/details/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
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

    // Get the ID from the context params
    const { id } = await Promise.resolve(context.params);
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { message: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get user details from users table
    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        u.*,
        up.date_of_birth, up.gender, up.phone as phone_number, 
        up.address, up.city, up.state, up.postal_code, up.country,
        up.job_title, up.industry, up.skills,
        up.highest_degree, up.field_of_study, up.institution, up.year_of_graduation,
        up.website, up.linkedin, up.github, up.twitter, up.facebook, up.instagram,
        up.nationality, up.id_number, up.passport_number,
        up.membership_number, up.membership_type, up.membership_status, 
        up.membership_expiry, up.join_date,
        up.personal_info, up.contact_info, up.education, up.employment, up.membership_info
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = userRows[0];

    // Parse JSON fields if they exist
    const parseJsonField = (field: string) => {
      try {
        return field ? JSON.parse(field) : null;
      } catch {
        return field;
      }
    };

    // Format the response
    const userDetails = {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.is_admin,
      isApproved: user.is_approved,
      createdAt: user.created_at,
      // Profile details
      profile: {
        personal: {
          dateOfBirth: user.date_of_birth,
          gender: user.gender,
          nationality: user.nationality,
          idNumber: user.id_number,
          passportNumber: user.passport_number,
          ...(user.personal_info ? parseJsonField(user.personal_info) : {})
        },
        contact: {
          phone: user.phone || user.phone_number,
          address: user.address,
          city: user.city,
          state: user.state,
          postalCode: user.postal_code,
          country: user.country,
          website: user.website,
          social: {
            linkedin: user.linkedin,
            github: user.github,
            twitter: user.twitter,
            facebook: user.facebook,
            instagram: user.instagram
          },
          ...(user.contact_info ? parseJsonField(user.contact_info) : {})
        },
        education: {
          highestDegree: user.highest_degree,
          fieldOfStudy: user.field_of_study,
          institution: user.institution,
          yearOfGraduation: user.year_of_graduation,
          ...(user.education ? parseJsonField(user.education) : {})
        },
        employment: {
          jobTitle: user.job_title,
          industry: user.industry,
          ...(user.employment ? parseJsonField(user.employment) : {})
        },
        skills: user.skills ? user.skills.split(',').map((s: string) => s.trim()) : [],
        membership: {
          number: user.membership_number || user.membership_number,
          type: user.membership_type,
          status: user.membership_status,
          expiry: user.membership_expiry,
          joinDate: user.join_date,
          ...(user.membership_info ? parseJsonField(user.membership_info) : {})
        }
      }
    };

    return NextResponse.json(userDetails);
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}