import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import * as salaryModel from '@/lib/models/salaryModel';

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

    const structures = await salaryModel.getAllSalaryStructures(parseInt(company_id), pool);
    
    for (let structure of structures) {
      structure.components = await salaryModel.getSalaryComponents(structure.id, pool);
    }

    return NextResponse.json({
      success: true,
      structures
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
