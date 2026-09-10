import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1001_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1001_library_view_settings.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const shape = await target.query(`select column_name,column_default,is_nullable from information_schema.columns
      where table_schema='public' and table_name='library_view_settings' order by ordinal_position`);
    assert.deepEqual(shape.rows.map((row) => row.column_name), ["owner_id", "resource_type", "view_mode", "row_version", "updated_at"]);
    assert.match(shape.rows.find((row) => row.column_name === "view_mode").column_default, /list/);
    const policy = await target.query(`select relrowsecurity,relforcerowsecurity from pg_class where oid='library_view_settings'::regclass`);
    assert.deepEqual(policy.rows[0], { relrowsecurity: true, relforcerowsecurity: true });

    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    await asUser(target, alice, (client) => client.query(
      "insert into library_view_settings(owner_id,resource_type,view_mode) values($1,'songs','grid-large')", [alice]));
    assert.equal((await asUser(target, alice, (client) => client.query("select view_mode from library_view_settings"))).rows[0].view_mode, "grid-large");
    assert.equal((await asUser(target, bob, (client) => client.query("select 1 from library_view_settings"))).rowCount, 0);
    await assert.rejects(asUser(target, bob, (client) => client.query(
      "insert into library_view_settings(owner_id,resource_type,view_mode) values($1,'songs','list')", [alice])), /row-level security|violates row-level security/);
    await assert.rejects(target.query(
      "insert into library_view_settings(owner_id,resource_type,view_mode) values($1,'lyrics','list')", [alice]), /check constraint/);

    await target.query(rollback);
    assert.equal((await target.query("select to_regclass('public.library_view_settings')::text value")).rows[0].value, null);
    await target.query("delete from schema_migrations where name='1001_library_view_settings.sql'");
    migrate(); migrate();
    assert.deepEqual((await target.query(`select
      exists(select 1 from schema_migrations where name='1001_library_view_settings.sql') applied,
      to_regclass('public.library_view_settings')::text relation`)).rows[0],
    { applied: true, relation: "library_view_settings" });
  } finally { await target.end(); }
  console.log("1001 library view settings fresh/repeat, constraints, RLS, rollback and upgrade: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

async function asUser(pool, ownerId, work) {
  const client = await pool.connect();
  try {
    await client.query("begin"); await client.query("set local role lyricscloud_app");
    await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
    const result = await work(client); await client.query("commit"); return result;
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { client.release(); }
}

function migrate() {
  const result = spawnSync("corepack", ["pnpm", "migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
