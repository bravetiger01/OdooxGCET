import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as payrollModel from '@/lib/models/payrollModel';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const payrun_id = searchParams.get('payrun_id');

    if (!payrun_id) {
      return NextResponse.json(
        { ok: false, error: "payrun_id is required" },
        { status: 400 }
      );
    }

    const payslips = await payrollModel.getPayslipsByPayrun(parseInt(payrun_id), pool);

    return NextResponse.json({
      ok: true,
      payslips
    });
  } catch (error: any) {
    console.error('Error fetching payslips:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
