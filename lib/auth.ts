import { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function comparePasswords(plainPassword: string, hashedPassword: string) {
  try {
    console.log('Comparing passwords...');
    console.log('Plain password (first 5 chars):', plainPassword.substring(0, 5) + '...');
    console.log('Hashed password (first 10 chars):', hashedPassword.substring(0, 10) + '...');
    console.log('Hash format:', hashedPassword.substring(0, 3));
    
    // Check hash format and use appropriate comparison method
    if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
      // bcrypt hash format
      const result = await bcrypt.compare(plainPassword, hashedPassword);
      console.log('bcrypt.compare result:', result);
      return result;
    } else if (hashedPassword.startsWith('$2y$')) {
      // Newer bcrypt format
      const result = await bcrypt.compare(plainPassword, hashedPassword);
      console.log('bcrypt.compare result (2y$):', result);
      return result;
    } else if (hashedPassword.length === 32 && !hashedPassword.includes('$')) {
      // Might be MD5 hash
      const crypto = require('crypto');
      const md5Hash = crypto.createHash('md5').update(plainPassword).digest('hex');
      const result = md5Hash === hashedPassword;
      console.log('MD5 comparison result:', result);
      return result;
    } else if (hashedPassword.length === 40 && hashedPassword.startsWith('$')) {
      // SHA-1 hash
      const crypto = require('crypto');
      const sha1Hash = crypto.createHash('sha1').update(plainPassword).digest('hex');
      const result = sha1Hash === hashedPassword;
      console.log('SHA-1 comparison result:', result);
      return result;
    } else if (hashedPassword.length === 64 && !hashedPassword.includes('$')) {
      // SHA-256 hash (from reset password API)
      const crypto = require('crypto');
      const sha256Hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
      const result = sha256Hash === hashedPassword;
      console.log('SHA-256 comparison result:', result);
      return result;
    } else {
      console.error('Unknown hash format:', hashedPassword.substring(0, 20));
      // Try bcrypt as fallback
      const result = await bcrypt.compare(plainPassword, hashedPassword);
      console.log('Fallback bcrypt.compare result:', result);
      return result;
    }
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export function generateToken(user: any) {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.is_admin },
    JWT_SECRET,
    { expiresIn: '7d' } // Extended from 1d to 7d
  );
}

export function verifyToken(token: string) {
  try {
    if (!token) {
      console.error('No token provided');
      throw new Error('Authentication token is required');
    }

    if (!JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      throw new Error('Server configuration error');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { 
      id: number; 
      email: string; 
      isAdmin: boolean;
      iat?: number;
      exp?: number;
    };

    // Log token expiration for debugging
    if (decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;
      console.log(`Token expires in ${expiresIn} seconds`);
      
      if (expiresIn <= 0) {
        console.log('Token has expired');
        throw new Error('Token has expired');
      }
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    
    // Return specific error for expired tokens
    if (error instanceof Error && error.message === 'Token has expired') {
      throw new Error('Token has expired');
    }
    
    throw new Error('Invalid or expired token');
  }
}

export interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: Date;
  profile?: any;
  membership_info?: any;
}

export async function getUserById(id: string | number): Promise<User | null> {
  const { pool } = await import('./db');
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.query<User[]>(
      'SELECT * FROM users WHERE id = ?',
      [typeof id === 'string' ? parseInt(id) : id]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  } finally {
    connection.release();
  }
}