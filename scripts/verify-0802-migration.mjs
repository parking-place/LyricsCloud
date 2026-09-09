import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0802_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0802_lifecycle.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const owner = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','deadline')", [song, owner]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query("commit");
    await asUser(target, owner, (client) => client.query("select soft_delete_song($1)", [song]));
    const deadline = (await target.query("select deleted_at,purge_at from resources where id=$1", [song])).rows[0];
    assert.equal(deadline.purge_at.getTime() - deadline.deleted_at.getTime(), 30 * 86_400_000);

    const requestedAt = new Date("2027-01-01T00:00:00.000Z");
    await target.query(`update app_users set status='withdrawal_pending',withdrawal_requested_at=$2,withdrawal_purge_at=$2::timestamptz+interval '7 days'
      where id=$1`, [owner, requestedAt]);
    await assert.rejects(target.query("update app_users set withdrawal_purge_at=withdrawal_purge_at+interval '1 second' where id=$1", [owner]), /app_users_withdrawal_state/);
    assert.equal((await target.query("select to_regclass('public.lifecycle_purge_runs')::text value")).rows[0].value, "lifecycle_purge_runs");

    await target.query(rollback);
    const removed = await target.query(`select
      exists(select 1 from information_schema.columns where table_name='resources' and column_name='purge_at') resource_deadline,
      exists(select 1 from information_schema.columns where table_name='app_users' and column_name='withdrawal_purge_at') account_deadline,
      to_regclass('public.lifecycle_purge_runs')::text purge_runs`);
    assert.deepEqual(removed.rows[0], { resource_deadline: false, account_deadline: false, purge_runs: null });
    migrate(); migrate();
    assert.equal((await target.query("select exists(select 1 from schema_migrations where name='0802_lifecycle.sql') applied")).rows[0].applied, true);
  } finally { await target.end(); }
  console.log("0802 trash deadlines, withdrawal grace, worker run state, rollback and recovery: OK");
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
