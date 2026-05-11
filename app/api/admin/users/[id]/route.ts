// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ResultSetHeader, RowDataPacket, PoolConnection } from 'mysql2/promise';
import { cookies } from 'next/headers';

async function getAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (authToken) return authToken;

  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: PoolConnection | null = null;
  
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const userId = parseInt(id, 10);
    
    console.log('Fetching user details for ID:', userId);
    
    if (isNaN(userId) || userId < 0) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const token = await getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !(decoded as any).isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    connection = await pool.getConnection();

    // Get user basic info
    const [users] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, email, is_admin, is_approved, created_at, updated_at, membership_number FROM users WHERE id = ?',
      [userId]
    );

    console.log('User query result:', users.length, 'rows');

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Get user profile if exists
    const [profileColumns] = await connection.query('SHOW COLUMNS FROM user_profiles');
    const profileColumnSet = new Set(((profileColumns as any[]) || []).map((r: any) => String(r.Field)));

    console.log('Profile columns:', Array.from(profileColumnSet));

    // Build SELECT clause based on available columns
    const selectFields = [
      'personal_info',
      'contact_info',
      'membership_info',
      'membership_type',
      'membership_number',
      'membership_status',
      'join_date',
      'education',
      'employment',
      'highest_degree',
      'institution',
      'year_of_graduation',
      'skills',
      'job_title',
      'current_position',
      'company',
                        'years_of_experience',
      // Personal flat columns
      'gender',
      'date_of_birth',
      'nationality',
            'profile_picture',
      // Contact flat columns
      'phone',
      'address',
      'city',
      'state',
      'postal_code',
      'country',
      'facebook',
      'twitter',
      'linkedin',
      'instagram',
      'github'
    ].filter(field => profileColumnSet.has(field));

    const profileQuery = selectFields.length > 0 
      ? `SELECT ${selectFields.join(', ')} FROM user_profiles WHERE user_id = ?`
      : 'SELECT NULL FROM DUAL WHERE 1=0';

    const [profiles] = await connection.query<RowDataPacket[]>(profileQuery, [userId]);

    console.log('Profile query result:', profiles.length, 'rows');

    const profile = profiles[0] || {};

    // Debug: Log all available profile data
    console.log('All profile fields from database:', Object.keys(profile));
    console.log('Profile data values:', profile);

    // Parse JSON fields with error handling
    const safeJsonParse = (jsonString: any) => {
      if (!jsonString) return {};
      if (typeof jsonString === 'object') return jsonString;
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.error('Error parsing JSON:', e, 'String was:', jsonString);
        return {};
      }
    };

    // Parse all JSON fields, handling both stringified JSON and already-parsed objects
    const personalInfo = safeJsonParse(profile.personal_info || {});
    const contactInfo = safeJsonParse(profile.contact_info || {});
    const professionalInfo = {};
    const membershipInfo = safeJsonParse(profile.membership_info || {});
    
    // Handle education and employment which might be arrays or objects
    let educationInfo = safeJsonParse(profile.education || {});
    let employmentInfo = safeJsonParse(profile.employment || {});
    
    // If education is an array, use the first item (most recent)
    if (Array.isArray(educationInfo) && educationInfo.length > 0) {
      educationInfo = educationInfo[0];
    }
    
    // If employment is an array, use the first item (current employment)
    if (Array.isArray(employmentInfo) && employmentInfo.length > 0) {
      employmentInfo = employmentInfo[0];
    }
    
    // Log the raw profile data for debugging
    console.log('Raw profile data:', {
      profile,
      personalInfo,
      contactInfo,
      professionalInfo,
      educationInfo,
      employmentInfo
    });

    // Also check direct columns for membership info
    const membershipType = profile.membership_type || membershipInfo.membershipType || membershipInfo.membership_type || 'personal';
    const profileMembershipNumber = profile.membership_number || membershipInfo.membershipNumber || membershipInfo.membership_number || '';
    const membershipStatus = profile.membership_status || membershipInfo.membershipStatus || membershipInfo.membership_status || '';
    const joinDate = profile.join_date || membershipInfo.joinDate || membershipInfo.join_date || user.created_at;
    const membershipExpiry = profile.membership_expiry || membershipInfo.membershipExpiry || membershipInfo.membership_expiry;

    // Validate membership type
    const validMembershipTypes = ['personal', 'organization'];
    const finalMembershipType = validMembershipTypes.includes(membershipType.toLowerCase()) ? membershipType.toLowerCase() : 'personal';

    // Use membership number from users table first, then profile table
    let finalMembershipNumber = user.membership_number || profileMembershipNumber;
    
    // Set membership status based on user approval status
    let finalMembershipStatus = membershipStatus;
    if (!finalMembershipStatus) {
      finalMembershipStatus = user.is_approved ? 'active' : 'pending';
    }
    
    // Override with actual approval status to ensure consistency
    finalMembershipStatus = user.is_approved ? 'active' : 'pending';
    
    console.log('User approval status:', user.is_approved);
    console.log('Original membership status from DB:', membershipStatus);
    console.log('Final membership status:', finalMembershipStatus);
    
    // Only generate and store membership number if user is approved AND no existing number in either table
    if (!finalMembershipNumber && user.is_approved) {
      const year = new Date().getFullYear().toString().slice(-2); // Get last 2 digits
      const randomNum = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
      finalMembershipNumber = `TLA${year}${randomNum}`;
      
      // Store membership number in both tables for consistency
      try {
        // Store in users table
        await connection.query(
          'UPDATE users SET membership_number = ?, updated_at = NOW() WHERE id = ?',
          [finalMembershipNumber, userId]
        );
        
        // Also store in user_profiles table if it exists
        await connection.query(
          'UPDATE user_profiles SET membership_number = ?, updated_at = NOW() WHERE user_id = ?',
          [finalMembershipNumber, userId]
        );
        
        console.log('New TLA membership number stored in both tables:', finalMembershipNumber);
      } catch (dbError) {
        console.error('Failed to store membership number:', dbError);
        // Continue without storing, but log the error
      }
    } else if (finalMembershipNumber) {
      // Convert existing MEM numbers to TLA format if they exist
      if (finalMembershipNumber.startsWith('MEM')) {
        const existingYear = finalMembershipNumber.substring(3, 5); // Extract YY from MEMYYxxxx
        const existingNumber = finalMembershipNumber.substring(5); // Extract xxxxx
        finalMembershipNumber = `TLA${existingYear}${existingNumber}`;
        
        // Update both tables with new format
        try {
          await connection.query(
            'UPDATE users SET membership_number = ?, updated_at = NOW() WHERE id = ?',
            [finalMembershipNumber, userId]
          );
          
          await connection.query(
            'UPDATE user_profiles SET membership_number = ?, updated_at = NOW() WHERE user_id = ?',
            [finalMembershipNumber, userId]
          );
          
          console.log('Converted MEM to TLA format:', finalMembershipNumber);
        } catch (dbError) {
          console.error('Failed to convert membership number format:', dbError);
        }
      }
      console.log('Using existing membership number from database:', finalMembershipNumber);
    }

    // Calculate expiry date (1 year from approval date if not set)
    let finalExpiryDate = membershipExpiry;
    if (!finalExpiryDate && user.is_approved && joinDate) {
      const approvalDate = new Date(joinDate);
      approvalDate.setFullYear(approvalDate.getFullYear() + 1);
      approvalDate.setMonth(1, 1); // Set to February 1st
      finalExpiryDate = approvalDate.toISOString().split('T')[0];
    }

    const userData = {
      ...user,
      membership_number: finalMembershipNumber,
      profile: {
        // Personal Information - prioritize JSON personalInfo, then flattened fields
        personalInfo: {
          fullName: personalInfo.fullName || personalInfo.name || profile.name || user.name || '',
          gender: personalInfo.gender || profile.gender || '',
          dateOfBirth: personalInfo.dateOfBirth || personalInfo.date_of_birth || profile.date_of_birth || '',
          nationality: personalInfo.nationality || profile.nationality || '',
          placeOfBirth: personalInfo.placeOfBirth || '',
          profilePicture: personalInfo.profilePicture || personalInfo.profile_picture || profile.profile_picture || ''
        },
        
        // Professional Information
        professionalInfo: {
          occupation: profile.job_title || profile.current_position || '',
          employer: profile.company || '',
          workAddress: profile.address || '',
          workPhone: profile.phone || '',
          workEmail: user.email || '',
          jobTitle: profile.job_title || '',
          currentPosition: profile.current_position || '',
          industry: profile.industry || '',
          yearsOfExperience: profile.years_of_experience || '',
          skills: profile.skills ? (Array.isArray(profile.skills) ? profile.skills : [profile.skills]) : []
        },
        
        // Contact Information - prioritize JSON contactInfo, then flattened fields
        contactInfo: {
          phone: contactInfo.phone || profile.phone || '',
          address: contactInfo.address || profile.address || '',
          city: contactInfo.city || profile.city || '',
          state: contactInfo.state || profile.state || '',
          country: contactInfo.country || profile.country || 'Tanzania',
          postalCode: contactInfo.postalCode || contactInfo.postal_code || profile.postal_code || '',
          email: contactInfo.email || user.email || '',
          socialMedia: {
            facebook: contactInfo.facebook || profile.facebook || '',
            twitter: contactInfo.twitter || profile.twitter || '',
            linkedin: contactInfo.linkedin || profile.linkedin || '',
            instagram: contactInfo.instagram || profile.instagram || '',
            github: contactInfo.github || profile.github || ''
          }
        },
        
        // Academic Information
        academicInfo: {
          educationLevel: educationInfo.educationLevel || educationInfo.highestDegree || educationInfo.degree || profile.highest_degree || '',
          institutionName: educationInfo.institutionName || educationInfo.institution || educationInfo.school || profile.institution || '',
          yearOfCompletion: educationInfo.yearOfCompletion || educationInfo.yearOfGraduation || educationInfo.graduationYear || educationInfo.year_of_graduation || profile.year_of_graduation || '',
          currentCompany: employmentInfo.currentCompany || employmentInfo.company || profile.company || '',
          currentIndustry: employmentInfo.currentIndustry || employmentInfo.industry || profile.industry || '',
          workExperience: employmentInfo.workExperience || employmentInfo.yearsOfExperience || profile.years_of_experience || '',
          workAddress: employmentInfo.workAddress || employmentInfo.work_address || profile.work_address || profile.address || '',
          workPhone: employmentInfo.workPhone || employmentInfo.work_phone || profile.work_phone || profile.phone || '',
          workEmail: employmentInfo.workEmail || employmentInfo.work_email || profile.work_email || user.email || ''
        },
        
        // Membership Information
        membership: {
          membershipType: membershipInfo.membershipType || profile.membership_type || finalMembershipType || '',
          membershipNumber: membershipInfo.membershipNumber || profile.membership_number || finalMembershipNumber || '',
          membershipStatus: membershipInfo.membershipStatus || profile.membership_status || finalMembershipStatus || '',
          joinDate: membershipInfo.joinDate || profile.join_date || joinDate || '',
          expiryDate: membershipInfo.expiryDate || membershipInfo.membership_expiry || profile.membership_expiry || finalExpiryDate || ''
        }
      }
    };

    console.log('Returning user data:', userData);

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: PoolConnection | null = null;
  
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const token = await getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !(decoded as any).isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, is_admin, is_approved } = body;

    connection = await pool.getConnection();

    const [result] = await connection.query<ResultSetHeader>(
      'UPDATE users SET name = ?, email = ?, is_admin = ?, is_approved = ?, updated_at = NOW() WHERE id = ?',
      [name, email, is_admin, is_approved, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'User updated successfully',
      userId
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: PoolConnection | null = null;
  
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const token = await getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || !(decoded as any).isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [users] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const user = users[0];
      
      await connection.query(
        `INSERT INTO deleted_users 
         (user_id, name, email, deleted_by, original_data)
         VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          user.name,
          user.email,
          request.headers.get('x-user-id') || null,
          JSON.stringify(user)
        ]
      );

      const [result] = await connection.query<ResultSetHeader>(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Failed to delete user');
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete user'
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}