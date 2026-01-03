import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as salaryModel from '@/lib/models/salaryModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// GET payroll settings
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

    const settings = await salaryModel.getPayrollSettings(parseInt(company_id), pool);

    const defaultSettings = {
      payroll_pf_rate_employee: 12,
      payroll_pf_rate_employer: 12,
      payroll_professional_tax: 200,
      ...settings
    };

    return NextResponse.json({
      success: true,
      settings: defaultSettings
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT update payroll settings
export async function PUT(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const { company_id, settings, admin_user_id } = body;

    if (!company_id || !settings || !admin_user_id) {
      return NextResponse.json(
        { success: false, error: "company_id, settings, and admin_user_id are required" },
        { status: 400 }
      );
    }

    const [adminRows] = await connection.query<any[]>(
      "SELECT role FROM users WHERE id = ? AND company_id = ?",
      [admin_user_id, company_id]
    );

    if (!adminRows.length || !['admin', 'payroll_officer'].includes(adminRows[0].role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    await salaryModel.updatePayrollSettings(company_id, settings, connection);
    await systemLogModel.createSystemLog(admin_user_id, company_id, 'PAYROLL_SETTINGS_UPDATED', 'Payroll settings updated', 'payroll', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Payroll settings updated successfully"
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
