// Ultra-fast single table migration
import { pool } from '@/lib/db';
import { readFileSync } from 'fs';

export async function POST(request: Request) {
  try {
    console.log('Starting ultra-fast single table migration...');
    
    // Get table name from request body
    const body = await request.json();
    const { tableName, limit = 100 } = body;
    
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
      
      console.log(`Processing table: ${tableName} (limit: ${limit} records)`);
      
      // Extract CREATE TABLE statement for this specific table
      const createTableRegex = new RegExp('CREATE TABLE.*\\`' + tableName + '\\`[^;]+;', 'gi');
      const createStatement = sqlFile.match(createTableRegex);
      
      if (createStatement && createStatement.length > 0) {
        try {
          await connection.query(createStatement[0]);
          console.log(`✅ Created table: ${tableName}`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.warn(`Warning creating table ${tableName}:`, error.message);
          }
        }
      }
      
      // Extract INSERT statements for this specific table
      const insertRegex = new RegExp('INSERT INTO \\`' + tableName + '\\`[^;]+;', 'gi');
      const insertStatements = sqlFile.match(insertRegex) || [];
      
      console.log(`Found ${insertStatements.length} INSERT statements for ${tableName}`);
      
      // Process only the requested number of records
      const statementsToProcess = insertStatements.slice(0, limit);
      let successCount = 0;
      let errorCount = 0;
      
      console.log(`Processing ${statementsToProcess.length} statements (out of ${insertStatements.length} total)`);
      
      // Process in very small batches for speed
      const batchSize = 10;
      for (let i = 0; i < statementsToProcess.length; i += batchSize) {
        const batch = statementsToProcess.slice(i, i + batchSize);
        
        for (const stmt of batch) {
          try {
            await connection.query(stmt.trim());
            successCount++;
          } catch (error) {
            errorCount++;
            // Skip duplicate entries silently
            if (!error.message.includes('Duplicate entry')) {
              console.warn(`Warning on INSERT:`, error.message.substring(0, 100));
            }
          }
        }
        
        // Show progress every 10 batches
        if ((i / batchSize) % 10 === 0) {
          console.log(`Progress: ${Math.min(i + batchSize, statementsToProcess.length)}/${statementsToProcess.length} statements`);
        }
      }
      
      // Verify the migration for this table
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``) as any[];
      
      console.log(`✅ Ultra-fast migration completed for ${tableName}: ${count[0].count} records`);
      
      return Response.json({
        success: true,
        message: `Successfully migrated table: ${tableName}`,
        stats: {
          tableName: tableName,
          recordsMigrated: count[0].count,
          statementsProcessed: statementsToProcess.length,
          totalStatementsAvailable: insertStatements.length,
          successfulInserts: successCount,
          errors: errorCount,
          remainingStatements: Math.max(0, insertStatements.length - limit)
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Ultra-fast migration failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET method to list available tables with counts
export async function GET() {
  try {
    console.log('Quick table listing...');
    
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
    
    // Count INSERT statements for each table
    const tableStats = [];
    
    for (const tableName of tableNames) {
      const insertRegex = new RegExp('INSERT INTO \\`' + tableName + '\\`[^;]+;', 'gi');
      const insertStatements = sqlFile.match(insertRegex) || [];
      
      tableStats.push({
        name: tableName,
        insertCount: insertStatements.length
      });
    }
    
    // Sort by insert count (most data first)
    tableStats.sort((a, b) => b.insertCount - a.insertCount);
    
    return Response.json({
      success: true,
      message: 'Quick table listing completed',
      tables: tableStats,
      totalTables: tableNames.length
    });
    
  } catch (error) {
    console.error('Quick table listing failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
