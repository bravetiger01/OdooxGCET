import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as payrollModel from '@/lib/models/payrollModel';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { ok: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    const payslips = await payrollModel.getPayslipsByUser(user_id, pool);

    return NextResponse.json({
      ok: true,
      payslips
    });
  } catch (error: any) {
    console.error('Error fetching user payslips:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
