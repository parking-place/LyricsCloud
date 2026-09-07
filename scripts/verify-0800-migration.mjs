import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0800_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0800_templates.sql", "utf8");
const lifecycleRollback = await readFile("packages/database/rollback/0802_lifecycle.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    assert.equal((await target.query("select count(*)::int count from templates where owner_id is null")).rows[0].count, 4);
    const templateId = randomUUID();
    await asUser(target, alice, (client) => client.query("insert into templates(id,owner_id,type,title,lyric_body) values($1,$2,'lyrics','Alice','[Hook]')", [templateId, alice]));
    assert.equal((await asUser(target, bob, (client) => client.query("select id from templates where id=$1", [templateId]))).rowCount, 0);
    assert.equal((await asUser(target, bob, (client) => client.query("update templates set title='forged' where id=$1 returning id", [templateId]))).rowCount, 0);
    await assert.rejects(asUser(target, bob, (client) => client.query("insert into templates(id,owner_id,type,title,lyric_body) values($1,$2,'lyrics','forged','')", [randomUUID(), alice])), /row-level security/);
    const defaultId = "08000000-0000-4000-8000-000000000001";
    assert.equal((await asUser(target, alice, (client) => client.query("select id from templates where id=$1", [defaultId]))).rowCount, 1);
    assert.equal((await asUser(target, alice, (client) => client.query("update templates set title='forged' where id=$1 returning id", [defaultId]))).rowCount, 0);
    await target.query(lifecycleRollback);
    await target.query(rollback);
    assert.equal((await target.query("select to_regclass('public.templates')::text value")).rows[0].value, null);
    migrate(); migrate();
    assert.equal((await target.query("select count(*)::int count from templates where owner_id is null")).rows[0].count, 4);
  } finally { await target.end(); }
  console.log("0800 template defaults, payload shape, forced RLS, rollback and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

async function asUser(pool, ownerId, work) {
  const client = await pool.connect();
  try { await client.query("begin"); await client.query("set local role lyricscloud_app"); await client.query("select set_config('app.user_id',$1,true)", [ownerId]); const result = await work(client); await client.query("commit"); return result; }
  catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { client.release(); }
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
