import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0900_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0900_beta_access.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const expected = ["beta_code_epochs", "beta_code_batches", "beta_codes", "beta_signup_intents",
      "admission_grants", "beta_redemptions", "beta_signup_failure_budgets", "beta_code_refreshes"];
    const tables = await target.query("select tablename from pg_tables where schemaname='public' and tablename=any($1::text[])", [expected]);
    assert.deepEqual(tables.rows.map((row) => row.tablename).sort(), expected.sort());
    const privileges = await target.query(`select count(*)::int count from information_schema.role_table_grants
      where grantee in ('PUBLIC','lyricscloud_app') and table_name=any($1::text[])`, [expected]);
    assert.equal(privileges.rows[0].count, 0);
    await assert.rejects(target.query("insert into beta_code_epochs(environment) values('production')"), /check constraint/);

    const userId = randomUUID(); const grantId = randomUUID();
    await target.query("insert into app_users(id) values($1)", [userId]);
    await target.query(`insert into admission_grants(id,environment,issuer,subject,user_id,source,state,granted_at,updated_at)
      values($1,'test','https://accounts.example.invalid','deleted-user',$2,'beta_code','active',now(),now())`, [grantId, userId]);
    await target.query("delete from app_users where id=$1", [userId]);
    assert.deepEqual((await target.query("select state,user_id,revoked_at is not null revoked from admission_grants where id=$1", [grantId])).rows[0],
      { state: "revoked", user_id: null, revoked: true });
    await target.query("delete from admission_grants where id=$1", [grantId]);

    await target.query("insert into beta_code_epochs(environment) values('test')");
    const batch = randomUUID();
    await target.query(`insert into beta_code_batches(id,environment,epoch,requested_count,issued_at,expires_at)
      values($1,'test',1,1,now(),now()+interval '1 day')`, [batch]);
    await target.query(`insert into beta_codes(batch_id,environment,epoch,code_digest,digest_kid,sealed_code,seal_nonce,seal_tag,issued_at,expires_at)
      values($1,'test',1,$2,'test-kid',$3,$4,$5,now(),now()+interval '1 day')`,
      [batch, "a".repeat(64), Buffer.from("cipher"), Buffer.alloc(12), Buffer.alloc(16)]);
    await assert.rejects(target.query(rollback), /rollback blocked/);
    await target.query("delete from beta_codes; delete from beta_code_batches; delete from beta_code_epochs");
    await target.query(rollback);
    assert.equal((await target.query("select to_regclass('public.beta_codes')::text value")).rows[0].value, null);
    migrate(); migrate();
    assert.equal((await target.query("select exists(select 1 from schema_migrations where name='0900_beta_access.sql') applied")).rows[0].applied, true);
  } finally { await target.end(); }
  console.log("0900 beta access schema, privilege boundary, rollback guard and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
