import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const { email, reportType, from, to, columns } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate the report
    const params = new URLSearchParams();
    params.append('type', reportType);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (columns?.length > 0) params.append('columns', columns.join(','));

    const reportResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/reports/generate?${params.toString()}`
    );
    
    if (!reportResponse.ok) {
      throw new Error('Failed to generate report');
    }

    const report = await reportResponse.json();
    
    if (!report.success) {
      throw new Error('Invalid report data');
    }

    // Convert report to CSV
    const headers = report.data.headers;
    const csvContent = [
      headers.join(','),
      ...report.data.rows.map((row: any) => 
        headers.map(header => 
          `"${String(row[header.toLowerCase().replace(/\s+/g, '_')] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');

    // Get report type name
    const reportTypeName = reportType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'reports@yourdomain.com',
      to: email,
      subject: `${reportTypeName} Report - ${new Date().toLocaleDateString()}`,
      text: `Please find attached the ${reportTypeName} report.`,
      attachments: [{
        filename: `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent
      }]
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
