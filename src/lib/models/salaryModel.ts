import { PoolConnection, Pool } from 'mysql2/promise';

// Get salary structure for a user
export async function getSalaryStructure(user_id: string, pool: Pool | PoolConnection) {
  const [rows] = await pool.query<any[]>(
    `SELECT * FROM salary_structures 
     WHERE user_id = ? AND is_active = TRUE 
     ORDER BY effective_from DESC LIMIT 1`,
    [user_id]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Get all salary structures for a company
export async function getAllSalaryStructures(company_id: number, pool: Pool) {
  const [rows] = await pool.query<any[]>(
    `SELECT 
      ss.*,
      u.first_name,
      u.last_name,
      u.email,
      ed.department,
      ed.job_position
    FROM salary_structures ss
    JOIN users u ON ss.user_id = u.id
    LEFT JOIN employment_details ed ON u.id = ed.user_id
    WHERE u.company_id = ? AND ss.is_active = TRUE
    ORDER BY u.first_name, u.last_name`,
    [company_id]
  );
  return rows;
}

// Get salary components for a structure
export async function getSalaryComponents(salary_structure_id: number, pool: Pool | PoolConnection) {
  const [rows] = await pool.query<any[]>(
    `SELECT * FROM salary_components 
     WHERE salary_structure_id = ? 
     ORDER BY component_type, component_name`,
    [salary_structure_id]
  );
  return rows;
}

// Create salary structure
export async function createSalaryStructure(
  user_id: string,
  monthly_wage: number,
  yearly_wage: number,
  effective_from: string,
  working_days_per_week: number,
  break_time_hours: number,
  connection: PoolConnection
): Promise<number> {
  // Deactivate old structures
  await connection.query(
    "UPDATE salary_structures SET is_active = FALSE WHERE user_id = ?",
    [user_id]
  );

  const [result] = await connection.query<any>(
    `INSERT INTO salary_structures 
     (user_id, monthly_wage, yearly_wage, effective_from, working_days_per_week, break_time_hours, is_active) 
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [user_id, monthly_wage, yearly_wage, effective_from, working_days_per_week || 5, break_time_hours || 1]
  );
  return result.insertId;
}

// Update salary structure
export async function updateSalaryStructure(
  id: number,
  monthly_wage: number,
  yearly_wage: number,
  working_days_per_week: number,
  break_time_hours: number,
  connection: PoolConnection
) {
  await connection.query(
    `UPDATE salary_structures 
     SET monthly_wage = ?, yearly_wage = ?, working_days_per_week = ?, break_time_hours = ?
     WHERE id = ?`,
    [monthly_wage, yearly_wage, working_days_per_week, break_time_hours, id]
  );
}

// Create salary component
export async function createSalaryComponent(
  salary_structure_id: number,
  component_name: string,
  component_type: string,
  calculation_type: string,
  value: number,
  connection: PoolConnection
): Promise<number> {
  const [result] = await connection.query<any>(
    `INSERT INTO salary_components 
     (salary_structure_id, component_name, component_type, calculation_type, value) 
     VALUES (?, ?, ?, ?, ?)`,
    [salary_structure_id, component_name, component_type, calculation_type, value]
  );
  return result.insertId;
}

// Delete all components for a structure
export async function deleteSalaryComponents(salary_structure_id: number, connection: PoolConnection) {
  await connection.query(
    "DELETE FROM salary_components WHERE salary_structure_id = ?",
    [salary_structure_id]
  );
}

// Get company payroll settings
export async function getPayrollSettings(company_id: number, pool: Pool | PoolConnection) {
  const [rows] = await pool.query<any[]>(
    `SELECT setting_key, setting_value, setting_type 
     FROM company_settings 
     WHERE company_id = ? AND setting_key LIKE 'payroll_%'`,
    [company_id]
  );
  
  const settings: Record<string, any> = {};
  rows.forEach(row => {
    let value: any = row.setting_value;
    if (row.setting_type === 'number') value = parseFloat(value);
    if (row.setting_type === 'boolean') value = value === 'true';
    settings[row.setting_key] = value;
  });
  
  return settings;
}

// Update payroll settings
export async function updatePayrollSettings(
  company_id: number,
  settings: Record<string, any>,
  connection: PoolConnection
) {
  for (const [key, value] of Object.entries(settings)) {
    const setting_type = typeof value === 'number' ? 'number' : 
                        typeof value === 'boolean' ? 'boolean' : 'string';
    
    await connection.query(
      `INSERT INTO company_settings (company_id, setting_key, setting_value, setting_type)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?, setting_type = ?`,
      [company_id, key, String(value), setting_type, String(value), setting_type]
    );
  }
}
