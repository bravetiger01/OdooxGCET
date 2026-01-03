import { PoolConnection } from 'mysql2/promise';

export async function findCompanyByCodeOrName(
  company_code: string,
  company_name: string,
  connection: PoolConnection
) {
  const [rows] = await connection.query<any[]>(
    "SELECT id FROM companies WHERE company_code = ? OR company_name = ?",
    [company_code, company_name]
  );
  return rows;
}

export async function findCompanyByName(company_name: string, connection: PoolConnection) {
  const [rows] = await connection.query<any[]>(
    "SELECT id FROM companies WHERE company_name = ?",
    [company_name]
  );
  return rows;
}

export async function createCompany(
  company_code: string,
  company_name: string,
  connection: PoolConnection
): Promise<number> {
  const [result] = await connection.query<any>(
    "INSERT INTO companies (company_code, company_name) VALUES (?, ?)",
    [company_code, company_name || null]
  );
  return result.insertId;
}

export async function findCompanyById(company_id: number, connection: PoolConnection) {
  const [rows] = await connection.query<any[]>(
    "SELECT * FROM companies WHERE id = ?",
    [company_id]
  );
  return rows;
}
