// Single table migration from SQL file to Aiven
import { pool } from '@/lib/db';
import { readFileSync } from 'fs';

export async function POST(request: Request) {
  try {
    console.log('Starting single table migration...');
    
    // Get table name from request body
    const body = await request.json();
    const { tableName } = body;
    
    if (!tableName) {
      return Response.json({
        success: false,
        error: 'Table name is required'
      }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Read the SQL file
      const sqlFile = readFileSync('lib/next_auth(4).sql', 'utf8');
      
      // Create the database if it doesn't exist
      await connection.query('CREATE DATABASE IF NOT EXISTS next_auth');
      await connection.query('USE next_auth');
      
      console.log(`Processing table: ${tableName}`);
      
      // Extract CREATE TABLE statement for this specific table
      const createTableRegex = new RegExp('CREATE TABLE.*\\`' + tableName + '\\`[^;]+;', 'gi');
      const createStatement = sqlFile.match(createTableRegex);
      
      if (createStatement && createStatement.length > 0) {
        try {
          await connection.query(createStatement[0]);
          console.log(`✅ Created table: ${tableName}`);
        } catch (error) {
          console.warn(`Warning creating table ${tableName}:`, error.message);
        }
      }
      
      // Extract INSERT statements for this specific table
      const insertRegex = new RegExp('INSERT INTO \\`' + tableName + '\\`[^;]+;', 'gi');
      const insertStatements = sqlFile.match(insertRegex) || [];
      
      console.log(`Found ${insertStatements.length} INSERT statements for ${tableName}`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process INSERT statements in batches
      const batchSize = 50;
      for (let i = 0; i < insertStatements.length; i += batchSize) {
        const batch = insertStatements.slice(i, i + batchSize);
        
        for (const stmt of batch) {
          try {
            await connection.query(stmt.trim());
            successCount++;
          } catch (error) {
            errorCount++;
            if (!error.message.includes('Duplicate entry')) {
              console.warn(`Warning on INSERT ${successCount + errorCount}:`, error.message);
            }
          }
        }
        
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(insertStatements.length/batchSize)} for ${tableName}`);
      }
      
      // Verify the migration for this table
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``) as any[];
      
      console.log(`✅ Migration completed for ${tableName}: ${count[0].count} records`);
      
      return Response.json({
        success: true,
        message: `Successfully migrated table: ${tableName}`,
        stats: {
          tableName: tableName,
          recordsMigrated: count[0].count,
          insertStatementsProcessed: insertStatements.length,
          successfulInserts: successCount,
          errors: errorCount
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Single table migration failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET method to list available tables
export async function GET() {
  try {
    console.log('Listing available tables for migration...');
    
    // Read the SQL file to extract table names
    const sqlFile = readFileSync('lib/next_auth(4).sql', 'utf8');
    
    // Extract all table names from CREATE TABLE statements
    const tableNames: string[] = [];
    const createTableRegex = /CREATE TABLE\s+`([^`]+)`/gi;
    let match;
      
    while ((match = createTableRegex.exec(sqlFile)) !== null) {
      const tableName = match[1];
      if (!tableNames.includes(tableName)) {
        tableNames.push(tableName);
      }
    }
    
    // Get connection to check existing tables
    const connection = await pool.getConnection();
    
    try {
      await connection.query('USE next_auth');
      
      // Check which tables already exist
      const existingTables = [];
      const missingTables = [];
      
      for (const tableName of tableNames) {
        try {
          const [result] = await connection.query(`SHOW TABLES LIKE '${tableName}'`) as any[];
          if (result && result.length > 0) {
            const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``) as any[];
            existingTables.push({
              name: tableName,
              records: count[0].count,
              status: 'exists'
            });
          } else {
            missingTables.push({
              name: tableName,
              status: 'missing'
            });
          }
        } catch (error) {
          missingTables.push({
            name: tableName,
            status: 'error',
            error: error.message
          });
        }
      }
      
      return Response.json({
        success: true,
        message: 'Table listing completed',
        tables: {
          existing: existingTables,
          missing: missingTables,
          total: tableNames.length
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Table listing failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
