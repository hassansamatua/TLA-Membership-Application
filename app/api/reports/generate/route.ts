import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const columns = searchParams.get('columns')?.split(',') || [];

    if (!type) {
      return NextResponse.json(
        { error: 'Report type is required' },
        { status: 400 }
      );
    }

    // Define column mappings for each report type
    const columnMappings: Record<string, Record<string, string>> = {
      membership: {
        'id': 'm.id',
        'name': 'u.name',
        'email': 'u.email',
        'membership_number': 'm.membership_number',
        'membership_type': 'm.membership_type',
        'status': 'm.status',
        'joined_date': 'm.joined_date',
        'expiry_date': 'm.expiry_date',
        'payment_status': 'm.payment_status',
        'payment_date': 'm.payment_date',
        'amount_paid': 'm.amount_paid'
      },
      financial: {
        'id': 'p.id',
        'user_id': 'p.user_id',
        'name': 'u.name',
        'email': 'u.email',
        'transaction_id': 'p.transaction_id',
        'amount': 'p.amount',
        'payment_method': 'p.payment_method',
        'status': 'p.status',
        'payment_date': 'p.payment_date',
        'due_date': 'p.due_date',
        'invoice_number': 'p.invoice_number',
        'description': 'p.description'
      },
      attendance: {
        'id': 'a.id',
        'user_id': 'a.user_id',
        'name': 'u.name',
        'email': 'u.email',
        'event_id': 'a.event_id',
        'event_name': 'e.title',
        'check_in_time': 'a.check_in_time',
        'check_out_time': 'a.check_out_time',
        'status': 'a.status',
        'duration_minutes': 'TIMESTAMPDIFF(MINUTE, a.check_in_time, a.check_out_time)'
      },
      inventory: {
        'id': 'i.id',
        'item_name': 'i.item_name',
        'category': 'i.category',
        'quantity': 'i.quantity',
        'available_quantity': 'i.available_quantity',
        'location': 'i.location',
        'status': 'i.status',
        'last_updated': 'i.last_updated'
      },
      event: {
        'id': 'e.id',
        'title': 'e.title',
        'description': 'e.description',
        'start_time': 'e.start_time',
        'end_time': 'e.end_time',
        'location': 'e.location',
        'status': 'e.status',
        'attendees_count': 'COUNT(DISTINCT a.user_id)',
        'capacity': 'e.capacity',
        'attendance_rate': 'ROUND(COUNT(DISTINCT a.user_id) / NULLIF(e.capacity, 0) * 100, 2)',
        'created_by': 'u.name'
      }
    };

    // Helper function to build SELECT clause
    const getSelectClause = (type: string, columns: string[]) => {
      const mappings = columnMappings[type as keyof typeof columnMappings] || {};
      const selectedColumns = columns.length > 0 ? columns : Object.keys(mappings);
      
      return selectedColumns
        .filter(col => mappings[col])
        .map(col => `${mappings[col]} as ${col}`)
        .join(', ');
    };

    let query = '';
    let params: any[] = [];
    let headers: string[] = [];

    switch (type) {
      case 'membership':
        const membershipColumns = columns.length > 0 ? columns : [
          'id', 'name', 'email', 'membership_number', 'membership_type',
          'status', 'joined_date', 'expiry_date', 'payment_status', 'amount_paid'
        ];
        
        query = `
          SELECT ${getSelectClause('membership', membershipColumns)}
          FROM memberships m
          JOIN users u ON m.user_id = u.id
          WHERE m.status = 'active'
        `;
        
        headers = membershipColumns;
        const status = searchParams.get('status') || 'active';
        
        if (status === 'active') {
          // Active members (not expired)
          query += ' AND m.expiry_date >= CURRENT_DATE()';
          query += ' ORDER BY m.expiry_date ASC';
        } 
        else if (status === 'new') {
          // New members (joined in the last 30 days)
          query += ' AND m.joined_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)';
          if (from) {
            query += ' AND m.joined_date >= ?';
            params.push(from);
          }
          if (to) {
            query += ' AND m.joined_date <= ?';
            params.push(to + ' 23:59:59');
          }
          query += ' ORDER BY m.joined_date DESC';
        }
        else if (status === 'expiring') {
          // Expiring soon (within next 30 days)
          query += ' AND m.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY)';
          query += ' ORDER BY m.expiry_date ASC';
        }
        
        // Add debug logging
        console.log('Executing membership query:', query);
        console.log('With params:', params);
        
        try {
          const [rows] = await pool.query<RowDataPacket[]>(query, params);
          console.log('Raw database results:', JSON.stringify(rows, null, 2));
          
          // Transform the rows to ensure proper JSON serialization
          const formattedRows = rows.map((row) => {
            const formattedRow: any = {};
            Object.entries(row).forEach(([key, value]) => {
              // Convert date objects to ISO strings
              if (value instanceof Date) {
                formattedRow[key] = value.toISOString();
              } else if (value === null || value === undefined) {
                formattedRow[key] = null;
              } else {
                formattedRow[key] = value;
              }
            });
            return formattedRow;
          });
          
          console.log('Formatted rows:', JSON.stringify(formattedRows, null, 2));
          
          return NextResponse.json({
            success: true,
            data: {
              headers: headers,
              rows: formattedRows
            }
          });
          
        } catch (error) {
          console.error('Database query error:', error);
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          return NextResponse.json(
            { error: 'Failed to execute database query', details: errorMessage },
            { status: 500 }
          );
        }
        break;

      case 'financial':
        const financialColumns = columns.length > 0 ? columns : [
          'id', 'transaction_id', 'name', 'email', 'amount', 
          'payment_method', 'status', 'payment_date', 'due_date'
        ];
        
        query = `
          SELECT ${getSelectClause('financial', financialColumns)}
          FROM payments p
          JOIN users u ON p.user_id = u.id
          WHERE 1=1
        `;
        
        headers = financialColumns;
        
        if (from) {
          query += ' AND p.payment_date >= ?';
          params.push(from);
        }
        if (to) {
          query += ' AND p.payment_date <= ?';
          params.push(to);
        }
        
        query += ' ORDER BY p.payment_date DESC';
        break;

      case 'attendance':
        const attendanceColumns = columns.length > 0 ? columns : [
          'id', 'name', 'email', 'event_name', 'check_in_time',
          'check_out_time', 'status', 'duration_minutes'
        ];
        
        query = `
          SELECT ${getSelectClause('attendance', attendanceColumns)}
          FROM attendance a
          JOIN users u ON a.user_id = u.id
          JOIN events e ON a.event_id = e.id
          WHERE 1=1
        `;
        
        headers = attendanceColumns;
        
        if (from) {
          query += ' AND DATE(a.check_in_time) >= ?';
          params.push(from);
        }
        if (to) {
          query += ' AND DATE(a.check_in_time) <= ?';
          params.push(to);
        }
        
        query += ' GROUP BY a.id ORDER BY a.check_in_time DESC';
        break;

      case 'inventory':
        const inventoryColumns = columns.length > 0 ? columns : [
          'id', 'item_name', 'category', 'quantity', 
          'available_quantity', 'location', 'status'
        ];
        
        query = `
          SELECT ${getSelectClause('inventory', inventoryColumns)}
          FROM inventory i
          WHERE 1=1
        `;
        
        headers = inventoryColumns;
        
        if (from) {
          query += ' AND i.last_updated >= ?';
          params.push(from);
        }
        if (to) {
          query += ' AND i.last_updated <= ?';
          params.push(to);
        }
        
        query += ' ORDER BY i.last_updated DESC';
        break;

      case 'event':
        const eventColumns = columns.length > 0 ? columns : [
          'id', 'title', 'start_time', 'end_time', 'location',
          'status', 'attendees_count', 'capacity', 'attendance_rate'
        ];
        
        query = `
          SELECT ${getSelectClause('event', eventColumns)}
          FROM events e
          LEFT JOIN attendance a ON e.id = a.event_id
          LEFT JOIN users u ON e.created_by = u.id
          WHERE 1=1
        `;
        
        if (from) {
          query += ' AND e.start_time >= ?';
          params.push(from);
        }
        if (to) {
          query += ' AND e.start_time <= ?';
          params.push(to);
        }
        
        query += ' GROUP BY e.id ORDER BY e.start_time DESC';
        headers = eventColumns;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    // Execute the query
    const [rows] = await pool.query(query, params);

    // Format the response
    const formattedRows = Array.isArray(rows) ? rows.map(row => {
      const formattedRow: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        if (value instanceof Date) {
          formattedRow[key] = value.toISOString();
        } else if (value === null || value === undefined) {
          formattedRow[key] = '-';
        } else if (typeof value === 'bigint') {
          formattedRow[key] = Number(value);
        } else {
          formattedRow[key] = value;
        }
      });
      return formattedRow;
    }) : [];

    return NextResponse.json({
      success: true,
      data: {
        type,
        from,
        to,
        totalRecords: formattedRows.length,
        headers: headers.map(header => 
          header.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        ),
        rows: formattedRows
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
