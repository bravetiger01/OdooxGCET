import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as attendanceModel from '@/lib/models/attendanceModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// GET all attendance records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');
    const user_id = searchParams.get('user_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    const attendance = await attendanceModel.getAllAttendance(
      parseInt(company_id),
      user_id || undefined,
      start_date || undefined,
      end_date || undefined,
      pool
    );

    return NextResponse.json({
      success: true,
      attendance
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST add/edit attendance (Admin/HR only)
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const { id, user_id, company_id, date, check_in, check_out, status, admin_user_id } = body;

    if (!user_id || !company_id || !date || !admin_user_id) {
      return NextResponse.json(
        { success: false, error: "user_id, company_id, date, and admin_user_id are required" },
        { status: 400 }
      );
    }

    const [adminRows] = await connection.query<any[]>(
      "SELECT role FROM users WHERE id = ? AND company_id = ?",
      [admin_user_id, company_id]
    );

    if (!adminRows.length || !['admin', 'hr_officer'].includes(adminRows[0].role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (id) {
      await attendanceModel.updateAttendance(id, check_in, check_out, status, connection);
      await systemLogModel.createSystemLog(admin_user_id, company_id, 'ATTENDANCE_UPDATED', `Attendance updated for user ${user_id} on ${date}`, 'attendance', connection);
    } else {
      await attendanceModel.createAttendance(user_id, company_id, date, check_in, check_out, status, connection);
      await systemLogModel.createSystemLog(admin_user_id, company_id, 'ATTENDANCE_CREATED', `Attendance created for user ${user_id} on ${date}`, 'attendance', connection);
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: id ? "Attendance updated successfully" : "Attendance created successfully"
    });
  } catch (error: any) {
    await connection.rollback();
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
