import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as payrollModel from '@/lib/models/payrollModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// GET payruns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');
    const status = searchParams.get('status');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    const payruns = await payrollModel.getPayruns(parseInt(company_id), status || undefined, pool);

    return NextResponse.json({
      success: true,
      payruns
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create payrun
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const { company_id, name, pay_period_start, pay_period_end, created_by } = body;

    if (!company_id || !name || !pay_period_start || !pay_period_end || !created_by) {
      return NextResponse.json(
        { success: false, error: "Required fields: company_id, name, pay_period_start, pay_period_end, created_by" },
        { status: 400 }
      );
    }

    const [userRows] = await connection.query<any[]>(
      "SELECT role FROM users WHERE id = ? AND company_id = ?",
      [created_by, company_id]
    );

    if (!userRows.length || !['admin', 'payroll_officer'].includes(userRows[0].role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const payrunId = await payrollModel.createPayrun(company_id, name, pay_period_start, pay_period_end, created_by, connection);
    await systemLogModel.createSystemLog(created_by, company_id, 'PAYRUN_CREATED', `Payrun ${name} created`, 'payroll', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Payrun created successfully",
      payrun_id: payrunId
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
