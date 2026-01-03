import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');

    if (!company_id) {
      return NextResponse.json(
        { ok: false, error: 'company_id is required' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<any[]>(
      'SELECT id, company_code, company_name, company_logo, created_at FROM companies WHERE id = ?',
      [company_id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      company: rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching company details:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
