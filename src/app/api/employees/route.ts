import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { pool } from '@/lib/db';
import { generateEmployeeId } from '@/lib/utils/idGenerator';
import { sendWelcomeEmail } from '@/lib/utils/emailService';
import * as companyModel from '@/lib/models/companyModel';
import * as userModel from '@/lib/models/userModel';
import * as employeeModel from '@/lib/models/employeeModel';
import * as systemLogModel from '@/lib/models/systemLogModel';
import * as leaveModel from '@/lib/models/leaveModel';

const BCRYPT_SALT_ROUNDS = 10;

// GET all employees
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

    const employees = await employeeModel.getAllEmployees(parseInt(company_id), pool);

    return NextResponse.json({
      success: true,
      employees
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST add new employee
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const {
      email, password, first_name, last_name, role, year_of_joining,
      phone, date_of_birth, gender, marital_status, personal_email, address, nationality, profile_picture,
      department, job_position, manager_id, location, date_of_joining, work_schedule,
      bank_name, account_number, ifsc_code, pan_number, uan_number,
      admin_user_id
    } = body;

    if (!admin_user_id || !email || !password || !first_name || !last_name || !role || !year_of_joining) {
      return NextResponse.json(
        { success: false, error: "Required fields: admin_user_id, email, password, first_name, last_name, role, year_of_joining" },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'hr_officer', 'payroll_officer', 'employee'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    const adminUser = await employeeModel.getUserById(admin_user_id, connection);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Admin user not found" },
        { status: 404 }
      );
    }

    const company_id = adminUser.company_id;
    const companyRows = await companyModel.findCompanyById(company_id, connection);
    if (!companyRows.length) {
      return NextResponse.json(
        { success: false, error: "Company not found" },
        { status: 404 }
      );
    }

    const existing = await userModel.findUserByCompanyAndEmail(company_id, email, connection);
    if (existing.length) {
      return NextResponse.json(
        { success: false, error: "Email already registered for this company" },
        { status: 409 }
      );
    }

    if (manager_id) {
      const managerExists = await employeeModel.checkUserExists(manager_id, company_id, connection);
      if (!managerExists) {
        return NextResponse.json(
          { success: false, error: "Invalid manager_id" },
          { status: 404 }
        );
      }
    }

    const employee_id = await generateEmployeeId(first_name, last_name, year_of_joining, companyRows[0].company_code, connection);
    const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await userModel.createUser(employee_id, company_id, email, password_hash, first_name, last_name, role, connection);
    await employeeModel.createUserProfile(employee_id, phone, date_of_birth, gender, marital_status, personal_email, address, nationality, profile_picture, connection);
    await employeeModel.createEmploymentDetails(employee_id, department, job_position, manager_id, location, date_of_joining, work_schedule, connection);
    await employeeModel.createFinancialDetails(employee_id, bank_name, account_number, ifsc_code, pan_number, uan_number, connection);
    await userModel.createUserSettings(employee_id, connection);

    const currentYear = new Date().getFullYear();
    const leaveTypes = await leaveModel.getLeaveTypes(company_id, connection);
    
    for (const leaveType of leaveTypes) {
      let totalDays = 12;
      const leaveName = leaveType.name.toLowerCase();
      if (leaveName.includes('casual')) totalDays = 12;
      else if (leaveName.includes('sick')) totalDays = 12;
      else if (leaveName.includes('earned') || leaveName.includes('privilege')) totalDays = 15;
      else if (leaveName.includes('maternity')) totalDays = 180;
      else if (leaveName.includes('paternity')) totalDays = 15;
      else if (leaveName.includes('comp')) totalDays = 0;
      
      await leaveModel.createLeaveAllocation(employee_id, leaveType.id, totalDays, currentYear, connection);
    }

    await systemLogModel.createSystemLog(admin_user_id, company_id, 'EMPLOYEE_ADDED', `New employee ${first_name} ${last_name} (${employee_id}) added`, 'employee', connection);
    await connection.commit();

    sendWelcomeEmail({
      email, first_name, last_name, employee_id, password,
      company_name: companyRows[0].company_name
    }).catch(err => console.error('Email error:', err));

    return NextResponse.json({
      success: true,
      message: "Employee added successfully. Welcome email sent to employee.",
      employee: { id: employee_id, company_id, email, first_name, last_name, role, department, job_position }
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
