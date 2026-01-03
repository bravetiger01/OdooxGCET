import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as leaveModel from '@/lib/models/leaveModel';

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

    const leaveTypes = await leaveModel.getLeaveTypes(parseInt(company_id), pool);

    return NextResponse.json({
      success: true,
      leaveTypes
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
