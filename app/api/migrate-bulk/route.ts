// Super-fast bulk migration
import { pool } from '@/lib/db';
import { readFileSync } from 'fs';

export async function POST(request: Request) {
  try {
    console.log('Starting super-fast bulk migration...');
    
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
      
      console.log(`Processing table: ${tableName} with bulk insert`);
      
      // Extract CREATE TABLE statement
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
      
      // Extract INSERT statements and convert to bulk insert
      const insertRegex = new RegExp('INSERT INTO \\`' + tableName + '\\`[^;]+;', 'gi');
      const insertStatements = sqlFile.match(insertRegex) || [];
      
      console.log(`Found ${insertStatements.length} INSERT statements for ${tableName}`);
      
      if (insertStatements.length === 0) {
        return Response.json({
          success: true,
          message: `No data found for table: ${tableName}`,
          stats: { recordsMigrated: 0 }
        });
      }
      
      // Parse first INSERT to get column names
      const firstInsert = insertStatements[0];
      const columnsMatch = firstInsert.match(/INSERT INTO `\w+` \(([^)]+)\) VALUES/);
      
      if (!columnsMatch) {
        return Response.json({
          success: false,
          error: 'Could not parse column names from INSERT statement'
        }, { status: 400 });
      }
      
      const columns = columnsMatch[1].split(',').map(col => col.trim().replace(/`/g, ''));
      
      // Extract all values and create bulk insert
      const allValues = [];
      
      for (const insertStmt of insertStatements) {
        const valuesMatch = insertStmt.match(/VALUES (.+)$/);
        if (valuesMatch) {
          // Parse the values part
          const valuesStr = valuesMatch[1];
          
          // Split by ),( but handle nested parentheses
          const valueGroups = [];
          let current = '';
          let depth = 0;
          
          for (let i = 0; i < valuesStr.length; i++) {
            const char = valuesStr[i];
            
            if (char === '(') depth++;
            if (char === ')') depth--;
            
            if (char === ',' && depth === 0) {
              if (current.trim()) {
                valueGroups.push(current.trim());
                current = '';
              }
            } else {
              current += char;
            }
          }
          
          if (current.trim()) {
            valueGroups.push(current.trim());
          }
          
          // Clean up each value group
          for (const group of valueGroups) {
            const cleanGroup = group.replace(/^[,\s]+|[,\s]+$/g, '');
            if (cleanGroup) {
              allValues.push(cleanGroup);
            }
          }
        }
      }
      
      console.log(`Extracted ${allValues.length} value groups for bulk insert`);
      
      // Create bulk insert statement
      const bulkInsert = `INSERT INTO \`${tableName}\` (${columns.join(', ')}) VALUES ${allValues.join(', ')}`;
      
      try {
        await connection.query(bulkInsert);
        console.log(`✅ Bulk insert completed for ${tableName}`);
      } catch (error) {
        console.warn(`Bulk insert failed, falling back to individual inserts:`, error.message);
        
        // Fallback to individual inserts (but limited)
        const fallbackLimit = Math.min(50, insertStatements.length);
        let successCount = 0;
        
        for (let i = 0; i < fallbackLimit; i++) {
          try {
            await connection.query(insertStatements[i]);
            successCount++;
          } catch (error) {
            if (!error.message.includes('Duplicate')) {
              console.warn(`Warning on INSERT ${i + 1}:`, error.message.substring(0, 50));
            }
          }
        }
        
        console.log(`Fallback completed: ${successCount}/${fallbackLimit} records`);
      }
      
      // Verify the migration
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``) as any[];
      
      console.log(`✅ Super-fast migration completed for ${tableName}: ${count[0].count} records`);
      
      return Response.json({
        success: true,
        message: `Successfully migrated table: ${tableName}`,
        stats: {
          tableName: tableName,
          recordsMigrated: count[0].count,
          insertStatementsFound: insertStatements.length,
          bulkInsertUsed: allValues.length > 0
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Super-fast migration failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
