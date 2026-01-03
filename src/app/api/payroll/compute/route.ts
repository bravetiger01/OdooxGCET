import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as payrollModel from '@/lib/models/payrollModel';
import * as salaryModel from '@/lib/models/salaryModel';
import * as systemLogModel from '@/lib/models/systemLogModel';
import { calculateComponents } from '@/lib/utils/payrollCalculator';

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

    const payrun = await payrollModel.getPayrunById(payrun_id, connection);
    if (!payrun) {
      return NextResponse.json(
        { success: false, error: "Payrun not found" },
        { status: 404 }
      );
    }

    const settings = await salaryModel.getPayrollSettings(company_id, connection);
    const pfRateEmployee = settings.payroll_pf_rate_employee || 12;
    const pfRateEmployer = settings.payroll_pf_rate_employer || 12;
    const professionalTax = settings.payroll_professional_tax || 200;

    const [employees] = await connection.query<any[]>(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
       FROM users u
       JOIN salary_structures ss ON u.id = ss.user_id
       WHERE u.company_id = ? AND u.is_active = TRUE AND ss.is_active = TRUE`,
      [company_id]
    );

    await payrollModel.deletePayslipsByPayrun(payrun_id, connection);

    const workingDaysPerWeek = settings.payroll_working_days_per_week || 5;
    const considerHalfDays = settings.payroll_consider_half_days !== false;
    const deductAbsentDays = settings.payroll_deduct_absent_days !== false;
    
    const startDate = new Date(payrun.pay_period_start);
    const endDate = new Date(payrun.pay_period_end);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalWorkingDays = Math.floor(totalDays * (workingDaysPerWeek/7));

    for (const employee of employees) {
      const structure = await salaryModel.getSalaryStructure(employee.id, connection);
      if (!structure) continue;

      const components = await salaryModel.getSalaryComponents(structure.id, connection);
      const calculated = calculateComponents(structure.monthly_wage, components);

      const [attendanceRows] = await connection.query<any[]>(
        `SELECT 
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
          COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_days,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days
         FROM attendance 
         WHERE user_id = ? AND date BETWEEN ? AND ?`,
        [employee.id, payrun.pay_period_start, payrun.pay_period_end]
      );

      const presentDays = attendanceRows[0].present_days || 0;
      const halfDays = attendanceRows[0].half_days || 0;
      
      let paidDays = presentDays;
      if (considerHalfDays) {
        paidDays += (halfDays * 0.5);
      }
      
      paidDays = Math.min(paidDays, totalWorkingDays);

      const attendanceRatio = deductAbsentDays ? (paidDays / totalWorkingDays) : 1;
      const proratedBasic = calculated.basic_salary * attendanceRatio;
      const proratedGross = calculated.gross_salary * attendanceRatio;

      const pfEmployee = (proratedBasic * pfRateEmployee) / 100;
      const pfEmployer = (proratedBasic * pfRateEmployer) / 100;

      const totalDeductions = calculated.total_deductions * attendanceRatio + pfEmployee + professionalTax;
      const netSalary = proratedGross - totalDeductions;

      const payslipId = await payrollModel.createPayslip({
        payrun_id,
        user_id: employee.id,
        total_working_days: totalWorkingDays,
        paid_days: paidDays,
        basic_salary: proratedBasic,
        gross_salary: proratedGross,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        status: 'computed'
      }, connection);

      for (const earning of calculated.earnings) {
        const amount = earning.amount * attendanceRatio;
        await payrollModel.createPayslipDetail(payslipId, earning.name, amount, 'earning', connection);
      }

      for (const deduction of calculated.deductions) {
        const amount = deduction.amount * attendanceRatio;
        await payrollModel.createPayslipDetail(payslipId, deduction.name, amount, 'deduction', connection);
      }

      await payrollModel.createPayslipDetail(payslipId, `Provident Fund (Employee ${pfRateEmployee}%)`, pfEmployee, 'deduction', connection);
      await payrollModel.createPayslipDetail(payslipId, `Provident Fund (Employer ${pfRateEmployer}%)`, pfEmployer, 'deduction', connection);
      await payrollModel.createPayslipDetail(payslipId, 'Professional Tax', professionalTax, 'deduction', connection);
    }

    await payrollModel.updatePayrunStatus(payrun_id, 'computed', connection);
    await systemLogModel.createSystemLog(admin_user_id, company_id, 'PAYROLL_COMPUTED', `Payroll computed for payrun ${payrun_id}`, 'payroll', connection);
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Payroll computed successfully",
      employee_count: employees.length
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
