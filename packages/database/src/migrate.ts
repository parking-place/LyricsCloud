import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeConfig } from "@lyricscloud/config";
import { Pool } from "pg";

const config = readRuntimeConfig(process.env);
const migrations = join(dirname(fileURLToPath(import.meta.url)), "../migrations");
const pool = new Pool({ connectionString: config.databaseUrl, max: 1 });
const client = await pool.connect();

try {
  await client.query("select pg_advisory_lock($1)", [741923]);
  await client.query(`create table if not exists schema_migrations (
    name text primary key,
    sha256 text not null,
    applied_at timestamptz not null default now()
  )`);
  for (const name of (await readdir(migrations)).filter((item) => item.endsWith(".sql")).sort()) {
    const sql = await readFile(join(migrations, name), "utf8");
    const sha256 = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query<{ sha256: string }>("select sha256 from schema_migrations where name = $1", [name]);
    if (existing.rowCount) {
      if (existing.rows[0]?.sha256 !== sha256) throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations(name, sha256) values ($1, $2)", [name, sha256]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
  console.log("Migrations: OK");
} finally {
  await client.query("select pg_advisory_unlock($1)", [741923]).catch(() => undefined);
  client.release();
  await pool.end();
}
