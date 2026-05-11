// Import database to Aiven
import { pool } from '@/lib/db';
import { readFileSync } from 'fs';

export async function POST() {
  try {
    console.log('Starting database import to Aiven...');
    
    // Read the SQL file
    const sqlFile = readFileSync('aiven_ready.sql', 'utf8');
    
    const connection = await pool.getConnection();
    
    try {
      // First, create the database if it doesn't exist
      await connection.query('CREATE DATABASE IF NOT EXISTS next_auth');
      await connection.query('USE next_auth');
      
      // Split the SQL file by DELIMITER blocks
      const delimiterBlocks = sqlFile.split('DELIMITER');
      
      for (let i = 0; i < delimiterBlocks.length; i++) {
        const block = delimiterBlocks[i].trim();
        
        if (!block) continue;
        
        if (i === 0) {
          // First block (before any DELIMITER) - regular SQL statements
          const statements = block.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
          
          for (const stmt of statements) {
            try {
              await connection.query(stmt);
              console.log(`Executed regular statement`);
            } catch (error) {
              console.warn(`Warning on regular statement:`, error.message);
            }
          }
        } else {
          // DELIMITER blocks (functions, triggers, etc.)
          const parts = block.split('DELIMITER');
          if (parts.length >= 2) {
            const delimiter = parts[0].trim();
            const sqlCode = parts[1].trim();
            
            if (sqlCode) {
              try {
                await connection.query(sqlCode);
                console.log(`Executed DELIMITER block with ${delimiter}`);
              } catch (error) {
                console.warn(`Warning on DELIMITER block:`, error.message);
              }
            }
          }
        }
      }
      
      console.log('Database import completed successfully!');
      
      return Response.json({
        success: true,
        message: 'Database import completed successfully'
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Database import failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
