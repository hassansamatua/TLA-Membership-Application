// Complete database import to Aiven
import { pool } from '@/lib/db';
import { readFileSync } from 'fs';

export async function POST() {
  try {
    console.log('Starting complete database import to Aiven...');
    
    const connection = await pool.getConnection();
    
    try {
      // Read the SQL file
      const sqlFile = readFileSync('lib/next_auth(4).sql', 'utf8');
      
      // Create the database if it doesn't exist
      await connection.query('CREATE DATABASE IF NOT EXISTS next_auth');
      await connection.query('USE next_auth');
      
      console.log('Processing SQL file...');
      
      // Process the SQL file in chunks to handle complex statements
      const lines = sqlFile.split('\n');
      let currentStatement = '';
      let inDelimiter = false;
      let delimiter = ';';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip comments and empty lines
        if (line.startsWith('--') || line === '' || line.startsWith('/*')) {
          continue;
        }
        
        // Handle DELIMITER changes
        if (line.startsWith('DELIMITER')) {
          const newDelimiter = line.split(' ')[1];
          if (newDelimiter) {
            delimiter = newDelimiter;
            inDelimiter = true;
            console.log(`Changed delimiter to: ${delimiter}`);
          }
          continue;
        }
        
        // Handle END DELIMITER
        if (line === 'END' && inDelimiter) {
          currentStatement += line;
          
          if (currentStatement.trim()) {
            try {
              await connection.query(currentStatement);
              console.log(`Executed DELIMITER statement`);
            } catch (error) {
              console.warn(`Warning on DELIMITER statement:`, error.message);
            }
          }
          
          currentStatement = '';
          inDelimiter = false;
          delimiter = ';';
          continue;
        }
        
        // Add line to current statement
        currentStatement += line + '\n';
        
        // Execute statement if it ends with the current delimiter
        if (line.endsWith(delimiter) && !inDelimiter) {
          if (currentStatement.trim()) {
            try {
              await connection.query(currentStatement);
              console.log(`Executed statement successfully`);
            } catch (error) {
              console.warn(`Warning on statement:`, error.message);
            }
          }
          currentStatement = '';
        }
      }
      
      // Execute any remaining statement
      if (currentStatement.trim() && !inDelimiter) {
        try {
          await connection.query(currentStatement);
          console.log(`Executed final statement successfully`);
        } catch (error) {
          console.warn(`Warning on final statement:`, error.message);
        }
      }
      
      console.log('Complete database import finished!');
      
      // Verify tables were created
      const [tables] = await connection.query('SHOW TABLES') as any[];
      console.log(`Tables created: ${tables.length}`);
      
      // Verify users exist
      const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users') as any[];
      console.log(`Users imported: ${userCount[0].count}`);
      
      return Response.json({
        success: true,
        message: 'Complete database import finished successfully',
        tablesCreated: tables.length,
        usersImported: userCount[0].count
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Complete database import failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
