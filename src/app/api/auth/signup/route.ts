import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { pool } from '@/lib/db';
import { generateEmployeeId } from '@/lib/utils/idGenerator';
import { generateUniqueCompanyCode } from '@/lib/utils/companyCodeGenerator';
import * as companyModel from '@/lib/models/companyModel';
import * as userModel from '@/lib/models/userModel';
import * as leaveModel from '@/lib/models/leaveModel';
import * as systemLogModel from '@/lib/models/systemLogModel';

const BCRYPT_SALT_ROUNDS = 10;

// Default leave types to create for new companies
const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual Leave', description: 'Paid annual vacation leave', is_paid: true, default_days: 20 },
  { name: 'Sick Leave', description: 'Paid sick leave for medical reasons', is_paid: true, default_days: 10 },
  { name: 'Casual Leave', description: 'Short-term casual leave', is_paid: true, default_days: 5 },
  { name: 'Unpaid Leave', description: 'Leave without pay', is_paid: false, default_days: 30 },
];

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const body = await request.json();
    const {
      company_name,
      email,
      password,
      first_name,
      last_name,
      phone,
      year_of_joining
    } = body;

    if (![company_name, email, password, first_name, last_name, year_of_joining].every(Boolean)) {
      return NextResponse.json(
        { success: false, error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Check if company name already exists
    const existingCompany = await companyModel.findCompanyByName(company_name, connection);
    if (existingCompany.length) {
      return NextResponse.json(
        { success: false, error: "Company name already exists" },
        { status: 409 }
      );
    }

    // Auto-generate unique company code from company name
    const company_code = await generateUniqueCompanyCode(company_name, connection);

    const company_id = await companyModel.createCompany(company_code, company_name, connection);
    const adminId = await generateEmployeeId(first_name, last_name, year_of_joining, company_code, connection);
    const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await userModel.createUser(adminId, company_id, email, password_hash, first_name, last_name, "admin", connection);
    await userModel.createUserProfile(adminId, phone, connection);
    await userModel.createEmploymentDetails(adminId, "Administration", "Company Admin", connection);
    await userModel.createFinancialDetails(adminId, connection);
    await userModel.createUserSettings(adminId, connection);

    // Create default leave types for the new company
    const currentYear = new Date().getFullYear();
    for (const leaveType of DEFAULT_LEAVE_TYPES) {
      const leaveTypeId = await leaveModel.createLeaveType(
        company_id,
        leaveType.name,
        leaveType.description,
        leaveType.is_paid,
        connection
      );

      // Create leave allocation for the admin user
      await leaveModel.createLeaveAllocation(
        adminId,
        leaveTypeId,
        leaveType.default_days,
        currentYear,
        connection
      );
    }

    await systemLogModel.createSystemLog(adminId, company_id, 'COMPANY_CREATED', 'New company and admin user created with default leave types', 'auth', connection);

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Company and admin created successfully",
      company: {
        id: company_id,
        code: company_code,
        name: company_name
      },
      admin_user_id: adminId
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
