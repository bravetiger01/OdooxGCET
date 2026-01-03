import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as salaryModel from '@/lib/models/salaryModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// PUT update salary structure
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      monthly_wage, yearly_wage, working_days_per_week,
      break_time_hours, components, admin_user_id, company_id
    } = body;

    if (!monthly_wage || !yearly_wage || !components || !admin_user_id || !company_id) {
      return NextResponse.json(
        { success: false, error: "Required fields: monthly_wage, yearly_wage, components, admin_user_id, company_id" },
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

    await salaryModel.updateSalaryStructure(
      parseInt(id), monthly_wage, yearly_wage,
      working_days_per_week, break_time_hours, connection
    );

    await salaryModel.deleteSalaryComponents(parseInt(id), connection);

    for (const comp of components) {
      await salaryModel.createSalaryComponent(
        parseInt(id), comp.component_name, comp.component_type,
        comp.calculation_type, comp.value, connection
      );
    }

    await systemLogModel.createSystemLog(admin_user_id, company_id, 'SALARY_STRUCTURE_UPDATED', `Salary structure ${id} updated`, 'payroll', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Salary structure updated successfully"
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
