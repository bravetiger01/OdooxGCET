import { PoolConnection } from 'mysql2/promise';

export async function createSystemLog(
  user_id: string,
  company_id: number,
  action: string,
  description: string,
  module: string,
  connection: PoolConnection
) {
  await connection.query(
    "INSERT INTO system_logs (user_id, company_id, action, description, module) VALUES (?, ?, ?, ?, ?)",
    [user_id, company_id, action, description, module]
  );
}
