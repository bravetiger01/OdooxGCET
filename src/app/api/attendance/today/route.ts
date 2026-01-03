import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as attendanceModel from '@/lib/models/attendanceModel';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const attendance = await attendanceModel.getTodayAttendance(user_id, today, pool);

    return NextResponse.json({
      success: true,
      attendance: attendance || null
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
