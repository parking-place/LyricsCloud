import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { dropMigrationTestDatabase } from "./migration-test-cleanup.mjs";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1150_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1150_native_read_sessions.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1150_native_read_sessions.sql'")).rows[0].count, 1);
    assert.equal((await target.query("select has_table_privilege('lyricscloud_app','native_sessions','select') allowed")).rows[0].allowed, false);
    assert.equal((await target.query("select has_table_privilege('lyricscloud_app','native_auth_transactions','select') allowed")).rows[0].allowed, false);

    const owner = (await target.query("insert into app_users default values returning id")).rows[0].id;
    await target.query(`insert into native_auth_transactions
      (transaction_hash,state_hash,pkce_challenge,redirect_uri_hash,expires_at,authorized_user_id,code_hash,code_expires_at,authorized_at)
      values($1,$2,$3,$4,statement_timestamp()+interval '10 minutes',$5,$6,statement_timestamp()+interval '1 minute',statement_timestamp())`,
    ["t".repeat(43), "s".repeat(43), "c".repeat(43), "r".repeat(43), owner, "a".repeat(43)]);
    await target.query(`insert into native_sessions(token_hash,user_id,scope,expires_at,absolute_expires_at)
      values($1,$2,'read',statement_timestamp()+interval '1 day',statement_timestamp()+interval '2 days')`, ["n".repeat(43), owner]);
    await assert.rejects(target.query(`insert into native_sessions(token_hash,user_id,scope,expires_at,absolute_expires_at)
      values($1,$2,'write',statement_timestamp()+interval '1 day',statement_timestamp()+interval '2 days')`, ["w".repeat(43), owner]));

    await target.query(rollback);
    assert.equal((await target.query("select count(*)::int count from native_sessions where user_id=$1", [owner])).rows[0].count, 1);
    assert.equal((await target.query("select count(*)::int count from native_auth_transactions where authorized_user_id=$1", [owner])).rows[0].count, 1);
    migrate();
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1150_native_read_sessions.sql'")).rows[0].count, 1);
  } finally { await target.end(); }
  console.log("1150 native auth fresh/repeat, read-only scope, role isolation and data-preserving rollback: OK");
} finally {
  await dropMigrationTestDatabase(admin, databaseName);
  await admin.end();
}

function migrate() {
  const result = spawnSync("corepack", ["pnpm", "migrate"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href, APP_VERSION: "1.1.8" }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
