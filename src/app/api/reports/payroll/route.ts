import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get('company_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    if (!company_id) {
      return NextResponse.json(
        { success: false, error: "company_id is required" },
        { status: 400 }
      );
    }

    let query = `
      SELECT 
        ps.id, ps.basic_salary, ps.gross_salary, ps.total_deductions, ps.net_salary,
        ps.paid_days, ps.total_working_days,
        u.id as user_id, u.first_name, u.last_name,
        ed.department,
        pr.name as payrun_name, pr.pay_period_start, pr.pay_period_end
      FROM payslips ps
      JOIN payruns pr ON ps.payrun_id = pr.id
      JOIN users u ON ps.user_id = u.id
      LEFT JOIN employment_details ed ON u.id = ed.user_id
      WHERE pr.company_id = ?
    `;

    const params: any[] = [company_id];

    if (start_date) {
      query += ' AND pr.pay_period_start >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND pr.pay_period_end <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY pr.pay_period_end DESC, u.first_name';

    const [payslips] = await pool.query<any[]>(query, params);

    const trendQuery = `
      SELECT 
        DATE_FORMAT(pr.pay_period_end, '%Y-%m') as month,
        DATE_FORMAT(pr.pay_period_end, '%b %Y') as month_label,
        COUNT(DISTINCT ps.id) as employee_count,
        SUM(ps.gross_salary) as total_gross,
        SUM(ps.total_deductions) as total_deductions,
        SUM(ps.net_salary) as total_net
      FROM payslips ps
      JOIN payruns pr ON ps.payrun_id = pr.id
      WHERE pr.company_id = ?
      ${start_date ? 'AND pr.pay_period_start >= ?' : ''}
      ${end_date ? 'AND pr.pay_period_end <= ?' : ''}
      GROUP BY DATE_FORMAT(pr.pay_period_end, '%Y-%m'), DATE_FORMAT(pr.pay_period_end, '%b %Y')
      ORDER BY month DESC
      LIMIT 12
    `;

    const trendParams: any[] = [company_id];
    if (start_date) trendParams.push(start_date);
    if (end_date) trendParams.push(end_date);

    const [trends] = await pool.query<any[]>(trendQuery, trendParams);

    const totals = {
      total_gross: payslips.reduce((sum: number, p: any) => sum + parseFloat(p.gross_salary || 0), 0),
      total_deductions: payslips.reduce((sum: number, p: any) => sum + parseFloat(p.total_deductions || 0), 0),
      total_net: payslips.reduce((sum: number, p: any) => sum + parseFloat(p.net_salary || 0), 0),
      employee_count: new Set(payslips.map((p: any) => p.user_id)).size
    };

    return NextResponse.json({
      success: true,
      payslips,
      trends: trends.reverse(),
      totals
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
