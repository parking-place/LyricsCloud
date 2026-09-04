import { Pool } from "pg";

export async function checkDatabase(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 2_000 });
  try { await pool.query("select 1"); } finally { await pool.end(); }
}
