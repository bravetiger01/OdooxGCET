import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as payrollModel from '@/lib/models/payrollModel';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const payslip_id = searchParams.get('payslip_id');

    if (!payslip_id) {
      return NextResponse.json(
        { ok: false, error: "payslip_id is required" },
        { status: 400 }
      );
    }

    const payslip = await payrollModel.getPayslipById(parseInt(payslip_id), pool);
    if (!payslip) {
      return NextResponse.json(
        { ok: false, error: "Payslip not found" },
        { status: 404 }
      );
    }

    const details = await payrollModel.getPayslipDetails(parseInt(payslip_id), pool);

    return NextResponse.json({
      ok: true,
      payslip,
      details
    });
  } catch (error: any) {
    console.error('Error fetching payslip details:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
