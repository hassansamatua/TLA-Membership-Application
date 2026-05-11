import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

// Configure the upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DOCUMENT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');
fs.mkdirSync(DOCUMENT_UPLOAD_DIR, { recursive: true });

async function getAuthToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (authToken) return authToken;

  try {
    const cookieStore = await cookies();
    return cookieStore.get('token')?.value || null;
  } catch {
    const cookieHeader = request.headers.get('cookie');
    return cookieHeader
      ? cookieHeader
          .split('; ')
          .find(c => c.trim().startsWith('token='))
          ?.split('=')[1] || null
      : null;
  }
}

const parseJsonValue = (value: unknown) => {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const safeJsonParse = (raw: FormDataEntryValue | null) => {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
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

// Helper function to generate membership number in TLA YY XXXXX format
function generateMembershipNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2); // Last two digits of current year
  const randomNumber = Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit random number
  return `TLA${year}${randomNumber}`;
}

// Helper function to get image dimensions
async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = URL.createObjectURL(file);
  });
}

const normalizeProfile = (row: any) => {
  // Parse personal_info JSON if available
  let personalInfoJson: any = {};
  if (row.personal_info) {
    try {
      personalInfoJson = JSON.parse(row.personal_info);
    } catch (e) {
      console.error('Error parsing personal_info JSON:', e);
    }
  }

  // Parse employment JSON if available
  let employmentJson: any = {};
  if (row.employment) {
    try {
      employmentJson = JSON.parse(row.employment);
    } catch (e) {
      console.error('Error parsing employment JSON:', e);
    }
  }

  // Parse education JSON if available
  let educationJson: any[] = [];
  if (row.education) {
    try {
      educationJson = JSON.parse(row.education);
    } catch (e) {
      console.error('Error parsing education JSON:', e);
    }
  }

  // Parse membership_info JSON if available
  let membershipInfoJson: any = {};
  if (row.membership_info) {
    try {
      membershipInfoJson = JSON.parse(row.membership_info);
    } catch (e) {
      console.error('Error parsing membership_info JSON:', e);
    }
  }

  return {
    personalInfo: {
      fullName: personalInfoJson.fullName || row.name || '',
      dateOfBirth: personalInfoJson.date_of_birth || personalInfoJson.dateOfBirth || row.date_of_birth || '',
      gender: personalInfoJson.gender || row.gender || '',
      placeOfBirth: personalInfoJson.place_of_birth || personalInfoJson.placeOfBirth || row.place_of_birth || '',
      profilePicture: row.profile_picture || null,
      nationality: personalInfoJson.nationality || row.nationality || '',
      idNumber: personalInfoJson.id_number || personalInfoJson.idNumber || row.id_number || ''
    },
    contactInfo: {
      email: row.email || '',
      phone: row.phone || row.phone_number || '',
      address: row.address || '',
      city: row.city || '',
      country: row.country || '',
      postalCode: row.postal_code || ''
    },
    professionalInfo: {
      occupation: employmentJson.occupation || row.job_title || row.current_position || '',
      company: employmentJson.company || row.employer_organization || row.industry || '',
      yearsOfExperience: employmentJson.yearsOfExperience || String(row.years_experience || row.years_of_experience || ''),
      specialization: employmentJson.specialization || row.specialization || '',
      skills: employmentJson.skills || (row.skills
        ? String(row.skills).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [])
    },
    education: Array.isArray(educationJson) && educationJson.length > 0 ? educationJson : [],
    membership: {
      membershipType: membershipInfoJson.membership?.membershipType || row.membership_type || '',
      membershipNumber: membershipInfoJson.membership?.membershipNumber || row.membership_number || '',
      membershipStatus: membershipInfoJson.membership?.membershipStatus || row.membership_status || '',
      joinDate: membershipInfoJson.membership?.joinDate || row.join_date || ''
    },
    payment: {
      paymentMethod: ''
    },
    participation: {
      previousEvents: [],
      areasOfInterest: [],
      volunteerInterest: false
    },
    documents: {
      idProof: row.id_proof_path || null,
      degreeCertificates: row.degree_certificates_path || null,
      cv: row.cv_path || null
    }
  };
};

async function updateProfileWithFormData(connection: PoolConnection, decodedId: number, formData: FormData) {
  const personalInfo = safeJsonParse(formData.get('personalInfo')) || {};
  const contactInfo = safeJsonParse(formData.get('contactInfo')) || null;
  const professionalInfo = safeJsonParse(formData.get('professionalInfo')) || null;
  const education = safeJsonParse(formData.get('education')) || null;
  const membership = safeJsonParse(formData.get('membership')) || null;
  const payment = safeJsonParse(formData.get('payment')) || null;
  const participation = safeJsonParse(formData.get('participation')) || null;

  const profilePicture = formData.get('profilePicture') as File | null;
  const profilePictureUrl = formData.get('profilePictureUrl') as string | null;

  const idProof = formData.get('idProof') as File | null;
  const cv = formData.get('cv') as File | null;
  const degreeCertificates = formData.getAll('degreeCertificates') as File[];

  const profileUpdate: Record<string, any> = {};

  profileUpdate.personal_info = JSON.stringify(personalInfo);
  if (contactInfo) profileUpdate.contact_info = JSON.stringify(contactInfo);
  if (professionalInfo) profileUpdate.employment = JSON.stringify(professionalInfo);
  if (education) profileUpdate.education = JSON.stringify(education);

  if (membership || payment || participation) {
    profileUpdate.membership_info = JSON.stringify({
      ...(membership ? { membership } : {}),
      ...(payment ? { payment } : {}),
      ...(participation ? { participation } : {})
    });
  }

  const dob = (personalInfo as any).date_of_birth || (personalInfo as any).dateOfBirth || null;
  const gender = (personalInfo as any).gender || null;
  const idNumber = (personalInfo as any).id_number || (personalInfo as any).idNumber || null;
  const nationality = (personalInfo as any).nationality || null;
  const placeOfBirth = (personalInfo as any).place_of_birth || (personalInfo as any).placeOfBirth || null;
  // Get phone number from contactInfo first, then fall back to personalInfo
  const phone = (contactInfo as any)?.phone || (personalInfo as any).phone_number || null;
  const address = (contactInfo as any)?.address || (personalInfo as any).address || null;
  const city = (contactInfo as any)?.city || (personalInfo as any).city || null;
  const country = (contactInfo as any)?.country || (personalInfo as any).country || null;
  const postalCode = (contactInfo as any)?.postalCode || (personalInfo as any).postal_code || (personalInfo as any).postalCode || null;

  if (dob) profileUpdate.date_of_birth = dob;
  if (gender) profileUpdate.gender = gender;
  if (idNumber) profileUpdate.id_number = idNumber;
  if (nationality) profileUpdate.nationality = nationality;
  if (placeOfBirth) profileUpdate.place_of_birth = placeOfBirth;
  if (phone) profileUpdate.phone = phone;
  if (address) profileUpdate.address = address;
  if (city) profileUpdate.city = city;
  if (country) profileUpdate.country = country;
  if (postalCode) profileUpdate.postal_code = postalCode;

  if (membership) {
    const membershipType = (membership as any).membershipType || (membership as any).membership_type || null;
    let membershipNumber = (membership as any).membershipNumber || (membership as any).membership_number || null;
    const membershipStatus = (membership as any).membershipStatus || (membership as any).membership_status || null;
    const joinDate = (membership as any).joinDate || (membership as any).join_date || null;
    
    // Generate membership number if not provided
    if (!membershipNumber && membershipType) {
      membershipNumber = generateMembershipNumber();
    }
    
    if (membershipType) profileUpdate.membership_type = membershipType;
    if (membershipNumber) profileUpdate.membership_number = membershipNumber;
    if (membershipStatus) profileUpdate.membership_status = membershipStatus;
    if (joinDate) profileUpdate.join_date = joinDate;
  }

  if (profilePicture && profilePicture.size > 0) {
    // Validate profile picture size and dimensions
    const maxSize = 5 * 1024 * 1024; // 5MB max
    const minWidth = 200;
    const minHeight = 200;
    const maxWidth = 2000;
    const maxHeight = 2000;
    
    if (profilePicture.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Profile picture too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }
    
    // Check image dimensions
    const dimensions = await getImageDimensions(profilePicture);
    if (dimensions) {
      const { width, height } = dimensions;
      if (width < minWidth || height < minHeight) {
        return NextResponse.json(
          { success: false, message: `Profile picture too small. Minimum dimensions are ${minWidth}x${minHeight}px.` },
          { status: 400 }
        );
      }
      if (width > maxWidth || height > maxHeight) {
        return NextResponse.json(
          { success: false, message: `Profile picture too large. Maximum dimensions are ${maxWidth}x${maxHeight}px.` },
          { status: 400 }
        );
      }
    }
    
    const fileExtension = profilePicture.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const bytes = await profilePicture.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.promises.writeFile(filePath, buffer);
    profileUpdate.profile_picture = `/uploads/profile-pictures/${fileName}`;
  } else if (profilePictureUrl) {
    if (profilePictureUrl.startsWith('data:image/')) {
      const match = profilePictureUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { success: false, message: 'Invalid profile picture format' },
          { status: 400 }
        );
      }
      const mimeType = match[1];
      const base64Data = match[2];
      const extension = mimeType.split('/')[1] || 'png';
      const fileName = `${uuidv4()}.${extension}`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.promises.writeFile(filePath, buffer);
      profileUpdate.profile_picture = `/uploads/profile-pictures/${fileName}`;
    } else {
      profileUpdate.profile_picture = profilePictureUrl;
    }
  }

  if (idProof && idProof.size > 0) {
    const fileExtension = idProof.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(DOCUMENT_UPLOAD_DIR, fileName);
    const bytes = await idProof.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.promises.writeFile(filePath, buffer);
    profileUpdate.id_proof_path = `/uploads/documents/${fileName}`;
  }

  if (cv && cv.size > 0) {
    const fileExtension = cv.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(DOCUMENT_UPLOAD_DIR, fileName);
    const bytes = await cv.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.promises.writeFile(filePath, buffer);
    profileUpdate.cv_path = `/uploads/documents/${fileName}`;
  }

  if (degreeCertificates && degreeCertificates.length > 0) {
    const uploaded: string[] = [];
    for (const cert of degreeCertificates) {
      if (!cert || cert.size === 0) continue;
      const fileExtension = cert.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = path.join(DOCUMENT_UPLOAD_DIR, fileName);
      const bytes = await cert.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.promises.writeFile(filePath, buffer);
      uploaded.push(`/uploads/documents/${fileName}`);
    }
    if (uploaded.length > 0) {
      profileUpdate.degree_certificates_path = JSON.stringify(uploaded);
    }
  }

  await connection.beginTransaction();
  try {
    const [existingProfile] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM user_profiles WHERE user_id = ?',
      [decodedId]
    );

    if (existingProfile?.length > 0) {
      const updateFields = Object.keys(profileUpdate);
      const updateValues = Object.values(profileUpdate);
      const setClause = updateFields.map(field => `\`${field}\` = ?`).join(', ');

      await connection.query(
        `UPDATE user_profiles SET ${setClause} WHERE user_id = ?`,
        [...updateValues, decodedId]
      );
    } else {
      const insertFields = ['user_id', ...Object.keys(profileUpdate)];
      const insertValues = [decodedId, ...Object.values(profileUpdate)];
      const placeholders = insertFields.map(() => '?').join(', ');
      const columns = insertFields.map(field => `\`${field}\``).join(', ');

      await connection.query(
        `INSERT INTO user_profiles (${columns}) VALUES (${placeholders})`,
        insertValues
      );
    }

    await connection.commit();

    const [users] = await connection.query<RowDataPacket[]>(
      `SELECT 
        u.*, 
        up.* 
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?`,
      [decodedId]
    );

    const updatedUser = users[0];
    if (updatedUser) {
      delete updatedUser.password;
      delete updatedUser.refresh_token;
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isAdmin: toBoolean(updatedUser.is_admin),
        isApproved: toBoolean(updatedUser.is_approved),
        membershipNumber: updatedUser.membership_number || updatedUser.membershipNumber || null,
        profile: normalizeProfile(updatedUser)
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

// GET endpoint to fetch user profile
export async function GET(request: Request) {
  const connection = (await pool.getConnection()) as PoolConnection;

  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch user data with profile
    const [users] = await connection.query<RowDataPacket[]>(
      `SELECT 
        u.*, 
        up.* 
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?`,
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    
    // Clean up sensitive data
    delete user.password;
    delete user.refresh_token;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: toBoolean(user.is_admin),
        isApproved: toBoolean(user.is_approved),
        membershipNumber: user.membership_number || user.membershipNumber || null,
        profile: normalizeProfile(user)
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/auth/profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// PUT endpoint to update user profile
export async function PUT(request: Request) {
  const connection = (await pool.getConnection()) as PoolConnection;
  
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      return await updateProfileWithFormData(connection, decoded.id, formData);
    }

    const body = await request.json().catch(() => ({}));
    const formData = new FormData();
    if (body?.personalInfo) formData.set('personalInfo', JSON.stringify(body.personalInfo));
    if (body?.contactInfo) formData.set('contactInfo', JSON.stringify(body.contactInfo));
    if (body?.professionalInfo) formData.set('professionalInfo', JSON.stringify(body.professionalInfo));
    if (body?.education) formData.set('education', JSON.stringify(body.education));
    if (body?.membership) formData.set('membership', JSON.stringify(body.membership));
    if (body?.payment) formData.set('payment', JSON.stringify(body.payment));
    if (body?.participation) formData.set('participation', JSON.stringify(body.participation));

    return await updateProfileWithFormData(connection, decoded.id, formData);
  } catch (error: unknown) {
    console.error('Error in updateProfileWithFormData:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check if it's a database error
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Database error code:', (error as any).code);
      console.error('Database error message:', (error as any).message);
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { 
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          details: error
        })
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// PATCH endpoint to update user profile with file upload
export async function PATCH(request: Request) {
  const connection = (await pool.getConnection()) as PoolConnection;
  
  try {
    const token = await getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    return await updateProfileWithFormData(connection, decoded.id, formData);
  } catch (error) {
    console.error('Error in PATCH /api/auth/profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: (error as Error).message })
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}