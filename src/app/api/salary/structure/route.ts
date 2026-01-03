import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as salaryModel from '@/lib/models/salaryModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// GET salary structure for a user
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

    const structure = await salaryModel.getSalaryStructure(user_id, pool);
    
    if (!structure) {
      return NextResponse.json({ success: true, structure: null, components: [] });
    }

    const components = await salaryModel.getSalaryComponents(structure.id, pool);

    return NextResponse.json({
      success: true,
      structure,
      components
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create salary structure
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const {
      user_id, company_id, monthly_wage, yearly_wage, working_days_per_week,
      break_time_hours, effective_from, components, admin_user_id
    } = body;

    if (!user_id || !company_id || !monthly_wage || !yearly_wage || !effective_from || !components || !admin_user_id) {
      return NextResponse.json(
        { success: false, error: "Required fields: user_id, company_id, monthly_wage, yearly_wage, effective_from, components, admin_user_id" },
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

    let totalPercentage = 0;
    let totalFixed = 0;
    
    for (const comp of components) {
      if (comp.component_type === 'earning') {
        if (comp.calculation_type === 'percentage_of_wage') {
          totalPercentage += parseFloat(comp.value);
        } else if (comp.calculation_type === 'fixed') {
          totalFixed += parseFloat(comp.value);
        }
      }
    }

    const percentageAmount = (monthly_wage * totalPercentage) / 100;
    if (percentageAmount + totalFixed > monthly_wage) {
      return NextResponse.json(
        { success: false, error: "Total salary components exceed the defined wage" },
        { status: 400 }
      );
    }

    const structureId = await salaryModel.createSalaryStructure(
      user_id, monthly_wage, yearly_wage, effective_from,
      working_days_per_week, break_time_hours, connection
    );

    for (const comp of components) {
      await salaryModel.createSalaryComponent(
        structureId, comp.component_name, comp.component_type,
        comp.calculation_type, comp.value, connection
      );
    }

    await systemLogModel.createSystemLog(admin_user_id, company_id, 'SALARY_STRUCTURE_CREATED', `Salary structure created for user ${user_id}`, 'payroll', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Salary structure created successfully",
      structure_id: structureId
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
