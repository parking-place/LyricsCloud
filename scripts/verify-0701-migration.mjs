import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { dropMigrationTestDatabase } from "./migration-test-cleanup.mjs";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0701_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0701_recent_searches.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    await target.query("insert into recent_searches(owner_id,query,search_type) values($1,'  ＦＩＲＥ  ','lyrics')", [alice]);
    assert.equal((await target.query("select normalized_query from recent_searches where owner_id=$1", [alice])).rows[0].normalized_query, "fire");

    const client = await target.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [bob]);
      assert.equal((await client.query("select * from recent_searches")).rowCount, 0);
      await assert.rejects(client.query("insert into recent_searches(owner_id,query,search_type) values($1,'leak','all')", [alice]), /row-level security/);
      await client.query("rollback");
    } finally { client.release(); }

    await target.query(rollback);
    assert.equal((await target.query("select to_regclass('public.recent_searches')::text value")).rows[0].value, null);
    assert.equal((await target.query("select search_normalize('ＦＩＲＥ') value")).rows[0].value, "fire");
    migrate(); migrate();
    assert.equal((await target.query("select to_regclass('public.recent_searches')::text value")).rows[0].value, "recent_searches");
  } finally { await target.end(); }
  console.log("0701 recent-search normalization, forced RLS, rollback and recovery: OK");
} finally {
  try { await dropMigrationTestDatabase(admin, databaseName); }
  finally { await admin.end(); }
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
