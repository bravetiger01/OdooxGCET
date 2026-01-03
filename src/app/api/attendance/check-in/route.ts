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
    const existingAttendance = await attendanceModel.getTodayAttendance(user_id, today, connection);

    if (existingAttendance) {
      return NextResponse.json(
        { success: false, error: "Already checked in today" },
        { status: 400 }
      );
    }

    const attendanceId = await attendanceModel.checkIn(user_id, company_id, connection);

    await systemLogModel.createSystemLog(user_id, company_id, 'CHECK_IN', `User checked in`, 'attendance', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Checked in successfully",
      attendance_id: attendanceId
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
