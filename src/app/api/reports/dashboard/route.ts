import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    const [employeeCount] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM users WHERE company_id = ? AND is_active = TRUE',
      [company_id]
    );

    const [pendingLeaves] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM leave_requests WHERE company_id = ? AND status = "pending"',
      [company_id]
    );

    const today = new Date().toISOString().split('T')[0];
    const [todayAttendance] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM attendance WHERE company_id = ? AND date = ? AND status = "present"',
      [company_id, today]
    );

    const [recentPayruns] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM payruns WHERE company_id = ? AND status = "validated" AND pay_period_end >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [company_id]
    );

    return NextResponse.json({
      success: true,
      stats: {
        total_employees: employeeCount[0].count,
        pending_leaves: pendingLeaves[0].count,
        today_attendance: todayAttendance[0].count,
        recent_payruns: recentPayruns[0].count
      }
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
