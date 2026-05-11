// lib/db.ts
import mysql from 'mysql2/promise';
import * as fs from 'fs';

// Create a connection pool for Aiven MySQL
const poolConfig: any = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'next_auth',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  // Explicitly disable SSL for localhost/XAMPP
  ssl: false
};

// Only enable SSL for non-localhost hosts with proper certificates
if (process.env.MYSQL_HOST && 
    !process.env.MYSQL_HOST.includes('localhost') && 
    process.env.MYSQL_SSL_CA) {
  try {
    // Check if SSL certificate files exist before trying to read them
    if (fs.existsSync(process.env.MYSQL_SSL_CA)) {
      poolConfig.ssl = {
        ca: fs.readFileSync(process.env.MYSQL_SSL_CA),
        cert: process.env.MYSQL_SSL_CERT && fs.existsSync(process.env.MYSQL_SSL_CERT) 
          ? fs.readFileSync(process.env.MYSQL_SSL_CERT) 
          : undefined,
        key: process.env.MYSQL_SSL_KEY && fs.existsSync(process.env.MYSQL_SSL_KEY) 
          ? fs.readFileSync(process.env.MYSQL_SSL_KEY) 
          : undefined,
        rejectUnauthorized: true
      };
      console.log('SSL enabled for Aiven connection');
    } else {
      console.warn('SSL CA certificate not found, using unencrypted connection');
      poolConfig.ssl = false;
    }
  } catch (error) {
    console.warn('SSL configuration failed, using unencrypted connection:', error);
    poolConfig.ssl = false;
  }
}

export const pool = mysql.createPool(poolConfig);

// Helper function to get a connection
export const getConnection = () => pool.getConnection();

// Helper function for queries
export const query = async (sql: string, params: any[] = []) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(sql, params);
    return rows;
  } finally {
    connection.release();
  }
};

// Helper function for transactions
export const executeInTransaction = async (callback: (connection: any) => Promise<any>) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// For backward compatibility
export const connectToDatabase = async () => {
  const connection = await pool.getConnection();
  return {
    ...connection,
    release: () => connection.release(),
    query: (sql: string, values?: any) => connection.query(sql, values)
  };
};

export default pool;