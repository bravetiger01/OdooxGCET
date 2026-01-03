import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as leaveModel from '@/lib/models/leaveModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// PUT approve/reject leave
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, approved_by, company_id } = body;

    if (!status || !approved_by || !company_id) {
      return NextResponse.json(
        { success: false, error: "status, approved_by, and company_id are required" },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const [approverRows] = await connection.query<any[]>(
      "SELECT role FROM users WHERE id = ? AND company_id = ?",
      [approved_by, company_id]
    );

    if (!approverRows.length || !['admin', 'hr_officer'].includes(approverRows[0].role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to approve/reject leaves" },
        { status: 403 }
      );
    }

    const request_data = await leaveModel.getLeaveRequestById(parseInt(id), connection);
    if (!request_data) {
      return NextResponse.json(
        { success: false, error: "Leave request not found" },
        { status: 404 }
      );
    }

    await leaveModel.updateLeaveStatus(parseInt(id), status, approved_by, connection);

    if (status === 'approved') {
      await leaveModel.updateLeaveAllocation(
        request_data.user_id,
        request_data.leave_type_id,
        new Date(request_data.start_date).getFullYear(),
        request_data.total_days,
        connection
      );
    }

    await systemLogModel.createSystemLog(
      approved_by, company_id,
      status === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      `Leave request ${id} ${status} by ${approved_by}`,
      'leave', connection
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `Leave request ${status} successfully`
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

// DELETE cancel leave request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { id } = await params;
    const body = await request.json();
    const { user_id, company_id } = body;

    if (!user_id || !company_id) {
      return NextResponse.json(
        { success: false, error: "user_id and company_id are required" },
        { status: 400 }
      );
    }

    const request_data = await leaveModel.getLeaveRequestById(parseInt(id), connection);
    if (!request_data) {
      return NextResponse.json(
        { success: false, error: "Leave request not found" },
        { status: 404 }
      );
    }

    if (request_data.user_id !== user_id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (request_data.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: "Can only cancel pending leave requests" },
        { status: 400 }
      );
    }

    await leaveModel.deleteLeaveRequest(parseInt(id), connection);
    await systemLogModel.createSystemLog(user_id, company_id, 'LEAVE_CANCELLED', `Leave request ${id} cancelled`, 'leave', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Leave request cancelled successfully"
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
