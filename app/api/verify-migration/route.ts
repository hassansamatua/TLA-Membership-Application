// Verify migration results
import { pool } from '@/lib/db';

export async function GET() {
  try {
    console.log('Verifying migration results...');
    
    const connection = await pool.getConnection();
    
    try {
      await connection.query('USE next_auth');
      
      // Get all tables
      const [tables] = await connection.query('SHOW TABLES') as any[];
      
      // Get counts from important tables
      const results = {};
      
      for (const table of tables) {
        const tableName = Object.values(table)[0] as string;
        
        try {
          const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``) as any[];
          results[tableName] = count[0].count;
        } catch (error) {
          results[tableName] = 'Error: ' + error.message;
        }
      }
      
      // Get sample users
      let sampleUsers = [];
      try {
        const [users] = await connection.query('SELECT id, name, email, membership_type, is_admin FROM users LIMIT 5') as any[];
        sampleUsers = users;
      } catch (error) {
        sampleUsers = [{ error: error.message }];
      }
      
      return Response.json({
        success: true,
        message: 'Migration verification completed',
        totalTables: tables.length,
        tableRecords: results,
        sampleUsers: sampleUsers
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Verification failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
