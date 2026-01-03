import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const status = searchParams.get('status');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    let query = `
      SELECT 
        lr.id, lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status, lr.created_at,
        u.id as user_id, u.first_name, u.last_name,
        lt.name as leave_type,
        ed.department
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN employment_details ed ON u.id = ed.user_id
      WHERE lr.company_id = ?
    `;

    const params: any[] = [company_id];

    if (start_date) {
      query += ' AND lr.start_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND lr.end_date <= ?';
      params.push(end_date);
    }

    if (status) {
      query += ' AND lr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY lr.created_at DESC';

    const [leaves] = await pool.query<any[]>(query, params);

    const distributionQuery = `
      SELECT 
        lt.name as leave_type,
        COUNT(lr.id) as count,
        SUM(lr.total_days) as total_days
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.company_id = ?
      ${start_date ? 'AND lr.start_date >= ?' : ''}
      ${end_date ? 'AND lr.end_date <= ?' : ''}
      ${status ? 'AND lr.status = ?' : ''}
      GROUP BY lt.id, lt.name
    `;

    const distParams: any[] = [company_id];
    if (start_date) distParams.push(start_date);
    if (end_date) distParams.push(end_date);
    if (status) distParams.push(status);

    const [distribution] = await pool.query<any[]>(distributionQuery, distParams);

    return NextResponse.json({
      success: true,
      leaves,
      distribution
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
