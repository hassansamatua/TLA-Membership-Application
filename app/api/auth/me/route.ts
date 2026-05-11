import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2/promise';

const parseJsonValue = (value: unknown) => {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  return false;
};

const normalizeProfile = (row: any) => {
  const personalInfoJson = parseJsonValue(row.personal_info) as any;
  const contactInfoJson = parseJsonValue(row.contact_info) as any;
  const educationJson = parseJsonValue(row.education) as any;
  const employmentJson = parseJsonValue(row.employment) as any;
  const membershipInfoJson = parseJsonValue(row.membership_info) as any;

  const membershipFromInfo = membershipInfoJson?.membership || {};
  const paymentFromInfo = membershipInfoJson?.payment || {};
  const participationFromInfo = membershipInfoJson?.participation || {};
  const documentsFromInfo = membershipInfoJson?.documents || {};

  const degreeCertificates = row.degree_certificates_path
    ? (parseJsonValue(row.degree_certificates_path) || row.degree_certificates_path)
    : (documentsFromInfo?.degreeCertificates || documentsFromInfo?.degree_certificates || null);

  return {
    personalInfo: {
      fullName: personalInfoJson?.fullName || personalInfoJson?.name || row.full_name || row.name || '',
      dateOfBirth: row.date_of_birth || personalInfoJson?.dateOfBirth || personalInfoJson?.date_of_birth || '',
      gender: row.gender || personalInfoJson?.gender || '',
      placeOfBirth: row.place_of_birth || personalInfoJson?.placeOfBirth || personalInfoJson?.place_of_birth || '',
      profilePicture: row.profile_picture || personalInfoJson?.profilePicture || personalInfoJson?.profile_picture || null,
      nationality: row.nationality || personalInfoJson?.nationality || '',
      idNumber: row.id_number || personalInfoJson?.idNumber || personalInfoJson?.id_number || ''
    },
    contactInfo: {
      email: row.email || '',
      phone: row.phone || contactInfoJson?.phone || '',
      address: row.address || contactInfoJson?.address || '',
      city: row.city || contactInfoJson?.city || '',
      country: row.country || contactInfoJson?.country || '',
      postalCode: row.postal_code || contactInfoJson?.postalCode || contactInfoJson?.postal_code || ''
    },
    professionalInfo: {
      occupation: row.job_title || row.current_position || employmentJson?.occupation || employmentJson?.jobTitle || '',
      company: row.employer_organization || row.industry || employmentJson?.company || '',
      yearsOfExperience: String(row.years_experience ?? row.years_of_experience ?? employmentJson?.yearsOfExperience ?? ''),
      specialization: employmentJson?.specialization || '',
      skills: row.skills
        ? String(row.skills).split(',').map((s: string) => s.trim()).filter(Boolean)
        : (Array.isArray(employmentJson?.skills) ? employmentJson.skills : [])
    },
    education: Array.isArray(educationJson) ? educationJson : [],
    membership: {
      membershipType: row.membership_type || membershipFromInfo?.membershipType || membershipFromInfo?.membership_type || '',
      membershipNumber: row.membership_number || membershipFromInfo?.membershipNumber || membershipFromInfo?.membership_number || '',
      membershipStatus: row.membership_status || membershipFromInfo?.membershipStatus || membershipFromInfo?.membership_status || '',
      joinDate: row.join_date || membershipFromInfo?.joinDate || membershipFromInfo?.join_date || ''
    },
    payment: {
      paymentMethod: paymentFromInfo?.paymentMethod || paymentFromInfo?.payment_method || paymentFromInfo?.method || ''
    },
    participation: {
      previousEvents: participationFromInfo?.previousEvents || participationFromInfo?.previous_events || [],
      areasOfInterest: participationFromInfo?.areasOfInterest || participationFromInfo?.areas_of_interest || [],
      volunteerInterest: toBoolean(participationFromInfo?.volunteerInterest ?? participationFromInfo?.volunteer_interest)
    },
    documents: {
      idProof: row.id_proof_path || documentsFromInfo?.idProof || documentsFromInfo?.id_proof || null,
      degreeCertificates,
      cv: row.cv_path || documentsFromInfo?.cv || null
    }
  };
};

export async function GET(request: Request) {
  let connection;
  try {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      token = cookieHeader
        ? cookieHeader
            .split('; ')
            .find(c => c.trim().startsWith('token='))
            ?.split('=')[1] || null
        : null;
    }

    if (!token) {
      return new NextResponse(
        JSON.stringify({ message: 'No token provided' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('[Auth/me] Token decoded:', decoded);
      if (!decoded?.id) {
        console.log('[Auth/me] Invalid token - no ID found');
        return new NextResponse(
          JSON.stringify({ message: 'Invalid or expired token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Token has expired') {
        return new NextResponse(
          JSON.stringify({ message: 'Token has expired' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return new NextResponse(
          JSON.stringify({ message: 'Invalid or expired token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get database connection
    connection = await pool.getConnection();

    // First, try to get user without profile to check if ID exists
    console.log('[Auth/me] Testing user table directly...');
    const [usersOnly] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, email, is_admin, is_approved, created_at, membership_number FROM users WHERE id = ?',
      [decoded.id]
    );
    
    console.log('[Auth/me] Direct user query result:', usersOnly);
    
    if (!usersOnly || usersOnly.length === 0) {
      console.log('[Auth/me] User not found in users table');
      return new NextResponse(
        JSON.stringify({ message: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const userOnly = usersOnly[0] as any;
    console.log('[Auth/me] User data from users table:', { id: userOnly.id, name: userOnly.name, email: userOnly.email });
    
    // Now try to get profile data separately
    let profileData = null;
    try {
      const [profiles] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [decoded.id]
      );
      
      if (profiles && profiles.length > 0) {
        profileData = profiles[0];
        console.log('[Auth/me] Profile data found:', profileData);
      } else {
        console.log('[Auth/me] No profile data found');
      }
    } catch (profileError) {
      console.log('[Auth/me] Profile query failed:', profileError);
    }
    
    // Combine user and profile data, but prioritize users table for membership_number
    const combinedUser = { ...profileData, ...userOnly };
    console.log('[Auth/me] Combined user data:', combinedUser);

    delete combinedUser.password;
    delete combinedUser.refresh_token;

    const responseData = {
      id: combinedUser.id,
      name: combinedUser.name,
      email: combinedUser.email,
      isAdmin: toBoolean(combinedUser.is_admin),
      isApproved: toBoolean(combinedUser.is_approved),
      membershipNumber: combinedUser.membership_number || null,
      createdAt: combinedUser.created_at,
      profile: normalizeProfile(combinedUser)
    };

    return new NextResponse(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        } 
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error('Error in /api/auth/me:', error);
    return new NextResponse(
      JSON.stringify({ 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}