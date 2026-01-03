import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as employeeModel from '@/lib/models/employeeModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

// GET employee by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    const employee = await employeeModel.getEmployeeById(id, parseInt(company_id), pool);

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT update employee
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
      first_name, last_name, email,
      phone, date_of_birth, gender, marital_status, personal_email, address, nationality,
      department, job_position, location,
      admin_user_id
    } = body;

    if (!admin_user_id) {
      return NextResponse.json(
        { success: false, error: "admin_user_id is required" },
        { status: 400 }
      );
    }

    const employeeExists = await employeeModel.getUserById(id, connection);
    if (!employeeExists) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    const requestingUser = await employeeModel.getUserById(admin_user_id, connection);
    if (!requestingUser) {
      return NextResponse.json(
        { success: false, error: "Requesting user not found" },
        { status: 404 }
      );
    }

    if (requestingUser.company_id !== employeeExists.company_id) {
      return NextResponse.json(
        { success: false, error: "Cannot update employee from different company" },
        { status: 403 }
      );
    }

    const isAdmin = requestingUser.role === 'admin' || requestingUser.role === 'hr_officer';
    const isSelf = requestingUser.id === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to update this employee's profile" },
        { status: 403 }
      );
    }

    await employeeModel.updateUser(id, first_name, last_name, email, connection);
    await employeeModel.updateUserProfile(id, phone, date_of_birth, gender, marital_status, personal_email, address, nationality, connection);
    await employeeModel.updateEmploymentDetails(id, department, job_position, location, connection);

    await systemLogModel.createSystemLog(
      admin_user_id || id,
      employeeExists.company_id,
      'EMPLOYEE_UPDATED',
      `Employee ${employeeExists.first_name} ${employeeExists.last_name} (${id}) profile updated`,
      'employee',
      connection
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully"
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
