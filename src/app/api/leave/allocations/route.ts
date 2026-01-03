import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as leaveModel from '@/lib/models/leaveModel';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get('user_id');
    const year = searchParams.get('year');

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const allocations = await leaveModel.getLeaveAllocations(user_id, currentYear, pool);

    return NextResponse.json({
      success: true,
      allocations
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
