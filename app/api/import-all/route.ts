// Import all tables and data to Aiven
import { pool } from '@/lib/db';
import { readFileSync } from 'fs';

export async function POST() {
  try {
    console.log('Starting comprehensive database import to Aiven...');
    
    const connection = await pool.getConnection();
    
    try {
      // Read the SQL file
      const sqlFile = readFileSync('lib/next_auth(4).sql', 'utf8');
      
      // Create the database if it doesn't exist
      await connection.query('CREATE DATABASE IF NOT EXISTS next_auth');
      await connection.query('USE next_auth');
      
      console.log('Extracting CREATE TABLE statements...');
      
      // Extract CREATE TABLE statements
      const createTableRegex = /CREATE TABLE[^;]+;/gi;
      const createStatements = sqlFile.match(createTableRegex);
      
      if (createStatements) {
        console.log(`Found ${createStatements.length} CREATE TABLE statements`);
        
        for (let i = 0; i < createStatements.length; i++) {
          const stmt = createStatements[i].trim();
          try {
            await connection.query(stmt);
            console.log(`Created table ${i + 1}/${createStatements.length}`);
          } catch (error) {
            console.warn(`Warning creating table ${i + 1}:`, error.message);
          }
        }
      }
      
      console.log('Extracting INSERT statements...');
      
      // Extract INSERT statements
      const insertRegex = /INSERT INTO[^;]+;/gi;
      const insertStatements = sqlFile.match(insertRegex);
      
      if (insertStatements) {
        console.log(`Found ${insertStatements.length} INSERT statements`);
        
        // Process INSERT statements in batches
        const batchSize = 50;
        for (let i = 0; i < insertStatements.length; i += batchSize) {
          const batch = insertStatements.slice(i, i + batchSize);
          
          for (let j = 0; j < batch.length; j++) {
            const stmt = batch[j].trim();
            try {
              await connection.query(stmt);
            } catch (error) {
              console.warn(`Warning on INSERT ${i + j + 1}:`, error.message);
            }
          }
          
          console.log(`Processed INSERT statements ${i + 1}-${Math.min(i + batchSize, insertStatements.length)}/${insertStatements.length}`);
        }
      }
      
      console.log('Extracting and executing remaining statements...');
      
      // Extract other statements (ALTER, etc.)
      const otherStatements = sqlFile
        .replace(/CREATE TABLE[^;]+;/gi, '')
        .replace(/INSERT INTO[^;]+;/gi, '')
        .replace(/DELIMITER[^;]*$/gi, '')
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));
      
      for (const stmt of otherStatements) {
        try {
          await connection.query(stmt);
          console.log(`Executed additional statement`);
        } catch (error) {
          console.warn(`Warning on additional statement:`, error.message);
        }
      }
      
      // Verify import
      const [tables] = await connection.query('SHOW TABLES') as any[];
      const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users') as any[];
      const [paymentCount] = await connection.query('SELECT COUNT(*) as count FROM payments') as any[];
      
      console.log('Database import completed successfully!');
      
      return Response.json({
        success: true,
        message: 'Comprehensive database import completed',
        tablesCreated: tables.length,
        usersImported: userCount[0].count,
        paymentsImported: paymentCount[0]?.count || 0
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Comprehensive database import failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
