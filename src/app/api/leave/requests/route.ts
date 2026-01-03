import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as leaveModel from '@/lib/models/leaveModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// GET all leave requests
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');
    const user_id = searchParams.get('user_id');
    const status = searchParams.get('status');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    const requests = await leaveModel.getLeaveRequests(
      parseInt(company_id),
      user_id || undefined,
      status || undefined,
      pool
    );

    return NextResponse.json({
      success: true,
      requests
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST apply for leave
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const { user_id, company_id, leave_type_id, start_date, end_date, total_days, reason, attachment } = body;

    if (!user_id || !company_id || !leave_type_id || !start_date || !end_date || !total_days) {
      return NextResponse.json(
        { success: false, error: "Required fields: user_id, company_id, leave_type_id, start_date, end_date, total_days" },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const allocation = await leaveModel.getLeaveAllocation(user_id, leave_type_id, currentYear, connection);

    if (!allocation) {
      return NextResponse.json(
        { success: false, error: "No leave allocation found for this leave type" },
        { status: 400 }
      );
    }

    const availableDays = allocation.total_days - allocation.used_days;
    if (total_days > availableDays) {
      return NextResponse.json(
        { success: false, error: `Insufficient leave balance. Available: ${availableDays} days` },
        { status: 400 }
      );
    }

    const requestId = await leaveModel.createLeaveRequest(
      user_id, company_id, leave_type_id, start_date, end_date, total_days, reason, attachment, connection
    );

    await systemLogModel.createSystemLog(user_id, company_id, 'LEAVE_APPLIED', `Leave request submitted for ${total_days} days`, 'leave', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Leave request submitted successfully",
      request_id: requestId
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
