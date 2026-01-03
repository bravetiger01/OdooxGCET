import { PoolConnection, Pool } from 'mysql2/promise';

// Get leave types for a company
export async function getLeaveTypes(company_id: number, pool: Pool | PoolConnection) {
  const [rows] = await pool.query<any[]>(
    "SELECT * FROM leave_types WHERE company_id = ? ORDER BY name",
    [company_id]
  );
  return rows;
}

// Get leave allocations for a user
export async function getLeaveAllocations(user_id: string, year: number, pool: Pool | PoolConnection) {
  const [rows] = await pool.query<any[]>(
    `SELECT 
      la.*,
      lt.name as leave_type_name,
      lt.is_paid
    FROM leave_allocations la
    JOIN leave_types lt ON la.leave_type_id = lt.id
    WHERE la.user_id = ? AND la.year = ?
    ORDER BY lt.name`,
    [user_id, year]
  );
  return rows;
}

// Get single leave allocation
export async function getLeaveAllocation(
  user_id: string,
  leave_type_id: number,
  year: number,
  connection: PoolConnection
) {
  const [rows] = await connection.query<any[]>(
    `SELECT * FROM leave_allocations 
     WHERE user_id = ? AND leave_type_id = ? AND year = ?`,
    [user_id, leave_type_id, year]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Get leave requests
export async function getLeaveRequests(
  company_id: number,
  user_id: string | undefined,
  status: string | undefined,
  pool: Pool
) {
  let query = `
    SELECT 
      lr.*,
      u.first_name,
      u.last_name,
      u.email,
      lt.name as leave_type_name,
      lt.is_paid,
      approver.first_name as approver_first_name,
      approver.last_name as approver_last_name
    FROM leave_requests lr
    JOIN users u ON lr.user_id = u.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN users approver ON lr.approved_by = approver.id
    WHERE lr.company_id = ?
  `;
  
  const params: any[] = [company_id];
  
  if (user_id) {
    query += ' AND lr.user_id = ?';
    params.push(user_id);
  }
  
  if (status) {
    query += ' AND lr.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY lr.created_at DESC';
  
  const [rows] = await pool.query<any[]>(query, params);
  return rows;
}

// Get leave request by ID
export async function getLeaveRequestById(id: number, connection: PoolConnection) {
  const [rows] = await connection.query<any[]>(
    "SELECT * FROM leave_requests WHERE id = ?",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Create leave request
export async function createLeaveRequest(
  user_id: string,
  company_id: number,
  leave_type_id: number,
  start_date: string,
  end_date: string,
  total_days: number,
  reason: string,
  attachment: string | null,
  connection: PoolConnection
): Promise<number> {
  const [result] = await connection.query<any>(
    `INSERT INTO leave_requests 
     (user_id, company_id, leave_type_id, start_date, end_date, total_days, reason, attachment, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [user_id, company_id, leave_type_id, start_date, end_date, total_days, reason, attachment]
  );
  return result.insertId;
}

// Update leave status
export async function updateLeaveStatus(
  id: number,
  status: string,
  approved_by: string,
  connection: PoolConnection
) {
  await connection.query(
    "UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?",
    [status, approved_by, id]
  );
}

// Update leave allocation (deduct used days)
export async function updateLeaveAllocation(
  user_id: string,
  leave_type_id: number,
  year: number,
  days_used: number,
  connection: PoolConnection
) {
  await connection.query(
    "UPDATE leave_allocations SET used_days = used_days + ? WHERE user_id = ? AND leave_type_id = ? AND year = ?",
    [days_used, user_id, leave_type_id, year]
  );
}

// Delete leave request
export async function deleteLeaveRequest(id: number, connection: PoolConnection) {
  await connection.query("DELETE FROM leave_requests WHERE id = ?", [id]);
}

// Create leave type (Admin only)
export async function createLeaveType(
  company_id: number,
  name: string,
  description: string,
  is_paid: boolean,
  connection: PoolConnection
): Promise<number> {
  const [result] = await connection.query<any>(
    "INSERT INTO leave_types (company_id, name, description, is_paid) VALUES (?, ?, ?, ?)",
    [company_id, name, description, is_paid]
  );
  return result.insertId;
}

// Create leave allocation (Admin/HR only)
export async function createLeaveAllocation(
  user_id: string,
  leave_type_id: number,
  total_days: number,
  year: number,
  connection: PoolConnection
): Promise<number> {
  const [result] = await connection.query<any>(
    "INSERT INTO leave_allocations (user_id, leave_type_id, total_days, used_days, year) VALUES (?, ?, ?, 0, ?)",
    [user_id, leave_type_id, total_days, year]
  );
  return result.insertId;
}
