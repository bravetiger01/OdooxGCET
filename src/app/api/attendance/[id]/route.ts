import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as attendanceModel from '@/lib/models/attendanceModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// DELETE attendance (Admin/HR only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { id } = await params;
    const body = await request.json();
    const { admin_user_id, company_id } = body;

    if (!admin_user_id || !company_id) {
      return NextResponse.json(
        { success: false, error: "admin_user_id and company_id are required" },
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

    await attendanceModel.deleteAttendance(parseInt(id), connection);
    await systemLogModel.createSystemLog(admin_user_id, company_id, 'ATTENDANCE_DELETED', `Attendance record ${id} deleted`, 'attendance', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Attendance deleted successfully"
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
