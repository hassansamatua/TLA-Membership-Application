// Complete database migration from SQL file to Aiven
import { pool } from '@/lib/db';
import { readFileSync } from 'fs';

export async function POST() {
  try {
    console.log('Starting complete database migration from SQL file to Aiven...');
    
    const connection = await pool.getConnection();
    
    try {
      // Read the complete SQL file
      const sqlFile = readFileSync('lib/next_auth(4).sql', 'utf8');
      
      // Create the database if it doesn't exist
      await connection.query('CREATE DATABASE IF NOT EXISTS next_auth');
      await connection.query('USE next_auth');
      
      console.log('Processing SQL file for complete migration...');
      
      // Split the SQL file into individual statements
      const statements = [];
      let currentStatement = '';
      let inDelimiter = false;
      let delimiter = ';';
      
      const lines = sqlFile.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip comments and empty lines
        if (line.startsWith('--') || line === '' || line.startsWith('/*') || line.startsWith('*/')) {
          continue;
        }
        
        // Handle DELIMITER changes
        if (line.toUpperCase().startsWith('DELIMITER')) {
          if (currentStatement.trim()) {
            statements.push(currentStatement.trim());
            currentStatement = '';
          }
          
          const parts = line.split(/\s+/);
          if (parts.length > 1) {
            delimiter = parts[1];
            inDelimiter = true;
          }
          continue;
        }
        
        currentStatement += line + '\n';
        
        // Check if statement ends with delimiter
        if (line.endsWith(delimiter)) {
          if (inDelimiter && delimiter !== ';') {
            // For custom delimiters, handle differently
            if (delimiter === '$$' && line.endsWith('$$')) {
              statements.push(currentStatement.trim());
              currentStatement = '';
              inDelimiter = false;
              delimiter = ';';
            }
          } else if (!inDelimiter && delimiter === ';') {
            statements.push(currentStatement.trim());
            currentStatement = '';
          }
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      
      console.log(`Found ${statements.length} SQL statements to execute`);
      
      let successCount = 0;
      let warningCount = 0;
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        
        if (!statement) continue;
        
        try {
          await connection.query(statement);
          successCount++;
          
          if (i % 10 === 0) {
            console.log(`Progress: ${i + 1}/${statements.length} statements executed`);
          }
        } catch (error) {
          warningCount++;
          console.warn(`Warning on statement ${i + 1}:`, error.message);
          console.warn(`Statement preview:`, statement.substring(0, 100) + '...');
        }
      }
      
      console.log(`Migration completed: ${successCount} successful, ${warningCount} warnings`);
      
      // Verify the migration
      const [tables] = await connection.query('SHOW TABLES') as any[];
      const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users') as any[];
      const [profileCount] = await connection.query('SELECT COUNT(*) as count FROM user_profiles') as any[];
      const [membershipCount] = await connection.query('SELECT COUNT(*) as count FROM memberships') as any[];
      
      console.log('Migration verification completed!');
      
      return Response.json({
        success: true,
        message: 'Complete database migration finished successfully',
        stats: {
          totalStatements: statements.length,
          successfulStatements: successCount,
          warnings: warningCount,
          tablesCreated: tables.length,
          usersMigrated: userCount[0].count,
          profilesMigrated: profileCount[0]?.count || 0,
          membershipsMigrated: membershipCount[0]?.count || 0
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Database migration failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
