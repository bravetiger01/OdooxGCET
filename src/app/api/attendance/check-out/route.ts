import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as attendanceModel from '@/lib/models/attendanceModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const { user_id, company_id } = body;

    if (!user_id || !company_id) {
      return NextResponse.json(
        { success: false, error: "user_id and company_id are required" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const attendance = await attendanceModel.getTodayAttendance(user_id, today, connection);

    if (!attendance) {
      return NextResponse.json(
        { success: false, error: "No check-in found for today" },
        { status: 400 }
      );
    }

    if (attendance.check_out) {
      return NextResponse.json(
        { success: false, error: "Already checked out today" },
        { status: 400 }
      );
    }

    await attendanceModel.checkOut(attendance.id, connection);
    await systemLogModel.createSystemLog(user_id, company_id, 'CHECK_OUT', `User checked out`, 'attendance', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Checked out successfully"
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
