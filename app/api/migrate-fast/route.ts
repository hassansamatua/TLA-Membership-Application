// Fast database migration from SQL file to Aiven
import { pool } from '@/lib/db';
import { readFileSync } from 'fs';

export async function POST() {
  try {
    console.log('Starting FAST database migration from SQL file to Aiven...');
    
    const connection = await pool.getConnection();
    
    try {
      // Read the SQL file
      const sqlFile = readFileSync('lib/next_auth(4).sql', 'utf8');
      
      // Create the database if it doesn't exist
      await connection.query('CREATE DATABASE IF NOT EXISTS next_auth');
      await connection.query('USE next_auth');
      
      console.log('Processing SQL file in optimized chunks...');
      
      // First, extract and execute all CREATE TABLE statements
      console.log('Step 1: Creating tables...');
      const createTableRegex = /CREATE TABLE[^;]+;/gi;
      const createStatements = sqlFile.match(createTableRegex) || [];
      
      for (let i = 0; i < createStatements.length; i++) {
        const stmt = createStatements[i].trim();
        try {
          await connection.query(stmt);
          console.log(`Created table ${i + 1}/${createStatements.length}`);
        } catch (error) {
          console.warn(`Warning creating table:`, error.message);
        }
      }
      
      // Second, extract and execute all INSERT statements in batches
      console.log('Step 2: Inserting data...');
      const insertRegex = /INSERT INTO[^;]+;/gi;
      const insertStatements = sqlFile.match(insertRegex) || [];
      
      console.log(`Found ${insertStatements.length} INSERT statements`);
      
      // Process in batches of 100 for better performance
      const batchSize = 100;
      for (let i = 0; i < insertStatements.length; i += batchSize) {
        const batch = insertStatements.slice(i, i + batchSize);
        
        for (const stmt of batch) {
          try {
            await connection.query(stmt.trim());
          } catch (error) {
            // Skip duplicate entries and other minor errors
            if (!error.message.includes('Duplicate entry')) {
              console.warn(`Warning on INSERT:`, error.message);
            }
          }
        }
        
        console.log(`Processed INSERT batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(insertStatements.length/batchSize)}`);
      }
      
      // Third, handle any remaining statements (ALTER, etc.)
      console.log('Step 3: Processing remaining statements...');
      const remainingSQL = sqlFile
        .replace(/CREATE TABLE[^;]+;/gi, '')
        .replace(/INSERT INTO[^;]+;/gi, '');
      
      const remainingStatements = remainingSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('/*') && !s.startsWith('DELIMITER'));
      
      for (const stmt of remainingStatements) {
        try {
          await connection.query(stmt);
        } catch (error) {
          console.warn(`Warning on remaining statement:`, error.message);
        }
      }
      
      // Quick verification
      const [tables] = await connection.query('SHOW TABLES') as any[];
      const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users') as any[];
      
      console.log('Fast migration completed!');
      
      return Response.json({
        success: true,
        message: 'Fast database migration completed successfully',
        stats: {
          tablesCreated: tables.length,
          insertStatementsProcessed: insertStatements.length,
          usersMigrated: userCount[0].count
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Fast migration failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
