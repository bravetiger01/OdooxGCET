import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    let query = `
      SELECT 
        a.id, a.date, a.check_in, a.check_out, a.work_hours, a.status,
        u.id as user_id, u.first_name, u.last_name,
        ed.department
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN employment_details ed ON u.id = ed.user_id
      WHERE a.company_id = ?
    `;

    const params: any[] = [company_id];

    if (start_date) {
      query += ' AND a.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND a.date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY a.date DESC, u.first_name';

    const [attendance] = await pool.query<any[]>(query, params);

    const weeklyQuery = `
      SELECT 
        WEEK(date, 1) as week_num,
        YEAR(date) as year,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
        COUNT(*) as total_count,
        ROUND((COUNT(CASE WHEN status = 'present' THEN 1 END) / COUNT(*)) * 100, 2) as attendance_rate
      FROM attendance
      WHERE company_id = ?
      ${start_date ? 'AND date >= ?' : ''}
      ${end_date ? 'AND date <= ?' : ''}
      GROUP BY YEAR(date), WEEK(date, 1)
      ORDER BY year DESC, week_num DESC
      LIMIT 4
    `;

    const weeklyParams: any[] = [company_id];
    if (start_date) weeklyParams.push(start_date);
    if (end_date) weeklyParams.push(end_date);

    const [weeklyStats] = await pool.query<any[]>(weeklyQuery, weeklyParams);

    return NextResponse.json({
      success: true,
      attendance,
      weeklyStats: weeklyStats.reverse()
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
