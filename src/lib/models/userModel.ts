import { Pool, PoolConnection } from 'mysql2/promise';

export async function findUserByEmail(email: string, connection: Pool | PoolConnection) {
  const [rows] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows as any[];
}

export async function findUserByCompanyAndEmail(company_id: number, email: string, connection: Pool | PoolConnection) {
  const [rows] = await connection.query(
    "SELECT id FROM users WHERE company_id = ? AND email = ?",
    [company_id, email]
  );
  return rows as any[];
}

export async function createUser(
  id: string,
  company_id: number,
  email: string,
  password_hash: string,
  first_name: string,
  last_name: string,
  role: string,
  connection: Pool | PoolConnection
) {
  await connection.query(
    "INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    [id, company_id, email, password_hash, first_name, last_name, role]
  );
}

export async function createUserProfile(user_id: string, phone: string | null, connection: Pool | PoolConnection) {
  await connection.query(
    "INSERT INTO user_profiles (user_id, phone) VALUES (?, ?)", 
    [user_id, phone || null]
  );
}

export async function createEmploymentDetails(
  user_id: string,
  department: string,
  job_position: string,
  connection: Pool | PoolConnection
) {
  await connection.query(
    "INSERT INTO employment_details (user_id, department, job_position, date_of_joining) VALUES (?, ?, ?, CURDATE())",
    [user_id, department, job_position]
  );
}

export async function createFinancialDetails(user_id: string, connection: Pool | PoolConnection) {
  await connection.query("INSERT INTO financial_details (user_id) VALUES (?)", [user_id]);
}

export async function createUserSettings(user_id: string, connection: Pool | PoolConnection) {
  await connection.query(
    "INSERT INTO user_settings (user_id, email_notifications, theme, language) VALUES (?, TRUE, 'light', 'en')",
    [user_id]
  );
}

export async function updateLastLogin(user_id: string, connection: Pool | PoolConnection) {
  await connection.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user_id]);
}
