// In app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// Add this GET handler
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
    
    // Get the status parameter from the URL
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let query = `
      SELECT u.id, u.name, u.email, u.is_admin as isAdmin, u.is_approved as isApproved, 
             u.created_at, u.updated_at,
             up.phone, up.address, up.city, up.state, up.country, up.postal_code,
             up.bio, up.profile_picture, up.cover_photo, up.company, up.job_title,
             up.current_position, up.industry, up.years_of_experience, up.skills,
             up.highest_degree, up.field_of_study, up.institution, up.year_of_graduation,
             up.additional_certifications, up.areas_of_interest, up.id_proof_path,
             up.degree_certificates_path, up.cv_path, up.website, up.twitter,
             up.linkedin, up.github, up.facebook, up.instagram, up.date_of_birth,
             up.gender, up.nationality, up.id_number, up.passport_number,
             up.membership_number, up.membership_type, up.membership_status,
             up.membership_expiry, up.join_date, up.personal_info, up.contact_info,
             up.education, up.employment, up.membership_info,
             up.professional_certifications, up.linkedin_profile,
             m.expiry_date, m.payment_status, m.amount_paid, m.payment_date,
             m.status as membership_status_from_db, m.joined_date as membership_joined_date
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN memberships m ON u.id = m.user_id
    `;
    
    const params: any[] = [];
    
    if (status === 'pending') {
      query += ' WHERE u.is_approved = 0 AND u.is_admin = 0';
    } else if (status === 'approved') {
      query += ' WHERE u.is_approved = 1 AND u.is_admin = 0';
    } else if (status === 'all') {
      // No additional filter - show all users including admins
    } else if (status === 'non-admin') {
      query += ' WHERE u.is_admin = 0';
    } else {
      // Default to all users (not pending) for general user management
      // No additional filter
    }
    
    query += ' ORDER BY u.created_at DESC';
    
    console.log('Users query:', query);
    console.log('Query params:', params);
    
    const [users] = await connection.query<RowDataPacket[]>(query, params);
    
    console.log('Users fetched:', users.length);
    
    // Transform the data to include profile information and calculate status
    const transformedUsers = users.map(user => {
      if (user.isAdmin) {
        console.log(`👑 Admin User ${user.name}: Always active, no expiry calculation`);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          isApproved: user.isApproved,
          status: 'active', // Admins are always active
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          profile: {
            phone: user.phone,
            address: user.address,
            city: user.city,
            state: user.state,
            country: user.country,
            postalCode: user.postal_code,
            bio: user.bio,
            profilePicture: user.profile_picture,
            coverPhoto: user.cover_photo,
            company: user.company,
            jobTitle: user.job_title,
            currentPosition: user.current_position,
            industry: user.industry,
            yearsOfExperience: user.years_of_experience,
            skills: user.skills,
            highestDegree: user.highest_degree,
            fieldOfStudy: user.field_of_study,
            institution: user.institution,
            yearOfGraduation: user.year_of_graduation,
            additionalCertifications: user.additional_certifications,
            areasOfInterest: user.areas_of_interest,
            idProofPath: user.id_proof_path,
            degreeCertificatesPath: user.degree_certificates_path,
            cvPath: user.cv_path,
            website: user.website,
            twitter: user.twitter,
            linkedin: user.linkedin,
            github: user.github,
            facebook: user.facebook,
            instagram: user.instagram,
            dateOfBirth: user.date_of_birth,
            gender: user.gender,
            nationality: user.nationality,
            idNumber: user.id_number,
            passportNumber: user.passport_number,
            membershipNumber: user.membership_number,
            membershipType: user.membership_type,
            membershipStatus: user.membership_status,
            membershipExpiry: user.membership_expiry,
            joinDate: user.join_date,
            personalInfo: user.personal_info,
            contactInfo: user.contact_info,
            education: user.education,
            employment: user.employment,
            membershipInfo: user.membership_info,
            professionalCertifications: user.professional_certifications,
            linkedinProfile: user.linkedin_profile
          }
        };
      }
      
      // Calculate final status - prioritize approval status over membership status
      let finalStatus: string;
      let membershipExpiry, now, activeByDate, paid;
      
      // First check if user is approved
      if (!user.isApproved) {
        finalStatus = 'pending';
      } else {
        // User is approved, now calculate membership status
        membershipExpiry = user.expiry_date ? new Date(user.expiry_date) : null;
        now = new Date();
        activeByDate = membershipExpiry ? membershipExpiry.getTime() >= now.getTime() : false;
        paid = user.payment_status === 'paid';
        
        // Active status depends on completed payment and membership existence - same as cards API
        const active = Boolean(
          user.membership_status_from_db === 'active' && 
          activeByDate && 
          paid
        );
        
        // Calculate membership status only for approved users
        finalStatus = active ? 'active' : (activeByDate ? 'inactive' : 'expired');
      }
      
      console.log(` User Status Calculation for ${user.name} (${user.isAdmin ? 'Admin' : 'User'}):`, {
        isApproved: user.isApproved,
        membershipExpiry: user.expiry_date,
        activeByDate,
        paid,
        membershipStatusFromDb: user.membership_status_from_db,
        calculatedStatus: finalStatus
      });
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isApproved: user.isApproved,
        status: finalStatus, // Use calculated status for non-admin users
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        profile: {
          phone: user.phone,
          address: user.address,
          city: user.city,
          state: user.state,
          country: user.country,
          postalCode: user.postal_code,
          bio: user.bio,
          profilePicture: user.profile_picture,
          coverPhoto: user.cover_photo,
          company: user.company,
          jobTitle: user.job_title,
          currentPosition: user.current_position,
          industry: user.industry,
          yearsOfExperience: user.years_of_experience,
          skills: user.skills,
          highestDegree: user.highest_degree,
          fieldOfStudy: user.field_of_study,
          institution: user.institution,
          yearOfGraduation: user.year_of_graduation,
          additionalCertifications: user.additional_certifications,
          areasOfInterest: user.areas_of_interest,
          idProofPath: user.id_proof_path,
          degreeCertificatesPath: user.degree_certificates_path,
          cvPath: user.cv_path,
          website: user.website,
          twitter: user.twitter,
          linkedin: user.linkedin,
          github: user.github,
          facebook: user.facebook,
          instagram: user.instagram,
          dateOfBirth: user.date_of_birth,
          gender: user.gender,
          nationality: user.nationality,
          idNumber: user.id_number,
          passportNumber: user.passport_number,
          membershipNumber: user.membership_number,
          membershipType: user.membership_type,
          membershipStatus: user.membership_status,
          membershipExpiry: user.membership_expiry,
          joinDate: user.join_date,
          personalInfo: user.personal_info,
          contactInfo: user.contact_info,
          education: user.education,
          employment: user.employment,
          membershipInfo: user.membership_info,
          professionalCertifications: user.professional_certifications,
          linkedinProfile: user.linkedin_profile
        }
      };
    });
    
    return NextResponse.json(transformedUsers, {
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Failed to fetch users' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// Your existing POST handler remains the same
export async function POST(request: Request) {
  // ... existing POST implementation ...
}