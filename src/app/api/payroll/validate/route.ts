import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as payrollModel from '@/lib/models/payrollModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const { payrun_id, admin_user_id, company_id } = body;

    if (!payrun_id || !admin_user_id || !company_id) {
      return NextResponse.json(
        { success: false, error: "payrun_id, admin_user_id, and company_id are required" },
        { status: 400 }
      );
    }

    const [userRows] = await connection.query<any[]>(
      "SELECT role FROM users WHERE id = ? AND company_id = ?",
      [admin_user_id, company_id]
    );

    if (!userRows.length || !['admin', 'payroll_officer'].includes(userRows[0].role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    await payrollModel.updatePayrunStatus(payrun_id, 'validated', connection);

    await connection.query(
      "UPDATE payslips SET status = 'validated' WHERE payrun_id = ?",
      [payrun_id]
    );

    await systemLogModel.createSystemLog(admin_user_id, company_id, 'PAYROLL_VALIDATED', `Payroll validated for payrun ${payrun_id}`, 'payroll', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Payroll validated successfully"
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
