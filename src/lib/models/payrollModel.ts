import { PoolConnection, Pool } from 'mysql2/promise';

// Create payrun
export async function createPayrun(
  company_id: number,
  name: string,
  pay_period_start: string,
  pay_period_end: string,
  created_by: string,
  connection: PoolConnection
): Promise<number> {
  const [result] = await connection.query<any>(
    `INSERT INTO payruns (company_id, name, pay_period_start, pay_period_end, created_by, status) 
     VALUES (?, ?, ?, ?, ?, 'draft')`,
    [company_id, name, pay_period_start, pay_period_end, created_by]
  );
  return result.insertId;
}

// Get payruns for company
export async function getPayruns(company_id: number, status: string | undefined, pool: Pool) {
  let query = `
    SELECT 
      pr.*,
      u.first_name as creator_first_name,
      u.last_name as creator_last_name,
      COUNT(ps.id) as employee_count,
      SUM(ps.net_salary) as total_net_salary
    FROM payruns pr
    JOIN users u ON pr.created_by = u.id
    LEFT JOIN payslips ps ON pr.id = ps.payrun_id
    WHERE pr.company_id = ?
  `;
  
  const params: any[] = [company_id];
  
  if (status) {
    query += ' AND pr.status = ?';
    params.push(status);
  }
  
  query += ' GROUP BY pr.id ORDER BY pr.created_at DESC';
  
  const [rows] = await pool.query<any[]>(query, params);
  return rows;
}

// Get payrun by ID
export async function getPayrunById(id: number, connection: PoolConnection) {
  const [rows] = await connection.query<any[]>(
    "SELECT * FROM payruns WHERE id = ?",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Update payrun status
export async function updatePayrunStatus(id: number, status: string, connection: PoolConnection) {
  await connection.query(
    "UPDATE payruns SET status = ? WHERE id = ?",
    [status, id]
  );
}

interface PayslipData {
  payrun_id: number;
  user_id: string;
  total_working_days: number;
  paid_days: number;
  basic_salary: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: string;
}

// Create payslip
export async function createPayslip(payslipData: PayslipData, connection: PoolConnection): Promise<number> {
  const {
    payrun_id,
    user_id,
    total_working_days,
    paid_days,
    basic_salary,
    gross_salary,
    total_deductions,
    net_salary,
    status
  } = payslipData;

  const [result] = await connection.query<any>(
    `INSERT INTO payslips 
     (payrun_id, user_id, total_working_days, paid_days, basic_salary, gross_salary, total_deductions, net_salary, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payrun_id, user_id, total_working_days, paid_days, basic_salary, gross_salary, total_deductions, net_salary, status]
  );
  return result.insertId;
}

// Get payslips for payrun
export async function getPayslipsByPayrun(payrun_id: number, pool: Pool) {
  const [rows] = await pool.query<any[]>(
    `SELECT 
      ps.*,
      u.first_name,
      u.last_name,
      u.email,
      ed.department,
      ed.job_position
    FROM payslips ps
    JOIN users u ON ps.user_id = u.id
    LEFT JOIN employment_details ed ON u.id = ed.user_id
    WHERE ps.payrun_id = ?
    ORDER BY u.first_name, u.last_name`,
    [payrun_id]
  );
  return rows;
}

// Get payslips for user
export async function getPayslipsByUser(user_id: string, pool: Pool) {
  const [rows] = await pool.query<any[]>(
    `SELECT 
      ps.*,
      pr.name as payrun_name,
      pr.pay_period_start,
      pr.pay_period_end
    FROM payslips ps
    JOIN payruns pr ON ps.payrun_id = pr.id
    WHERE ps.user_id = ?
    ORDER BY pr.pay_period_end DESC`,
    [user_id]
  );
  return rows;
}

// Get payslip by ID
export async function getPayslipById(id: number, pool: Pool) {
  const [rows] = await pool.query<any[]>(
    `SELECT 
      ps.*,
      u.first_name,
      u.last_name,
      u.email,
      ed.department,
      ed.job_position,
      pr.name as payrun_name,
      pr.pay_period_start,
      pr.pay_period_end
    FROM payslips ps
    JOIN users u ON ps.user_id = u.id
    LEFT JOIN employment_details ed ON u.id = ed.user_id
    JOIN payruns pr ON ps.payrun_id = pr.id
    WHERE ps.id = ?`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Create payslip detail
export async function createPayslipDetail(
  payslip_id: number,
  component_name: string,
  amount: number,
  component_type: string,
  connection: PoolConnection
): Promise<number> {
  const [result] = await connection.query<any>(
    `INSERT INTO payslip_details (payslip_id, component_name, amount, component_type) 
     VALUES (?, ?, ?, ?)`,
    [payslip_id, component_name, amount, component_type]
  );
  return result.insertId;
}

// Get payslip details
export async function getPayslipDetails(payslip_id: number, pool: Pool) {
  const [rows] = await pool.query<any[]>(
    `SELECT * FROM payslip_details 
     WHERE payslip_id = ? 
     ORDER BY component_type, component_name`,
    [payslip_id]
  );
  return rows;
}

// Update payslip status
export async function updatePayslipStatus(id: number, status: string, connection: PoolConnection) {
  await connection.query(
    "UPDATE payslips SET status = ? WHERE id = ?",
    [status, id]
  );
}

// Delete payslips for payrun
export async function deletePayslipsByPayrun(payrun_id: number, connection: PoolConnection) {
  // First delete payslip details
  await connection.query(
    "DELETE pd FROM payslip_details pd JOIN payslips ps ON pd.payslip_id = ps.id WHERE ps.payrun_id = ?",
    [payrun_id]
  );
  
  // Then delete payslips
  await connection.query(
    "DELETE FROM payslips WHERE payrun_id = ?",
    [payrun_id]
  );
}
