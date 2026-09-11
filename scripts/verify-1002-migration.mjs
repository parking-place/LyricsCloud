import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1002_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1002_library_manual_order.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const first = randomUUID(); const second = randomUUID();
    await target.query("begin");
    await target.query(`insert into resources(id,owner_id,type,title,is_pinned,pin_order) values
      ($1,$3,'song','first',true,0),($2,$3,'song','second',false,null)`, [first, second, alice]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$3),($2,$3)", [first, second, alice]);
    await target.query("commit");
    await target.query("delete from schema_migrations where name='1002_library_manual_order.sql'");
    await target.query(rollback);
    migrate(); migrate();

    const state = await target.query("select row_version from library_order_states where owner_id=$1 and resource_type='song'", [alice]);
    assert.equal(state.rows[0].row_version, "0");
    const items = await target.query(`select resource_id,pin_group,sort_rank::text from library_order_items
      where owner_id=$1 order by pin_group desc,sort_rank`, [alice]);
    assert.deepEqual(items.rows, [
      { resource_id: first, pin_group: true, sort_rank: "1048576" },
      { resource_id: second, pin_group: false, sort_rank: "1048576" }
    ]);
    for (const table of ["library_order_states", "library_order_items", "library_order_move_requests"]) {
      const policy = await target.query(`select relrowsecurity,relforcerowsecurity from pg_class where oid=$1::regclass`, [table]);
      assert.deepEqual(policy.rows[0], { relrowsecurity: true, relforcerowsecurity: true });
    }
    assert.equal((await asUser(target, alice, (client) => client.query("select 1 from library_order_items"))).rowCount, 2);
    assert.equal((await asUser(target, bob, (client) => client.query("select 1 from library_order_items"))).rowCount, 0);
    await assert.rejects(asUser(target, bob, (client) => client.query(
      "insert into library_order_states(owner_id,resource_type) values($1,'song')", [alice])), /row-level security/);
    await assert.rejects(target.query(`insert into library_order_items(owner_id,resource_type,resource_id,pin_group,sort_rank)
      values($1,'song',$2,false,0)`, [alice, first]), /check constraint/);
  } finally { await target.end(); }
  console.log("1002 manual order fresh/repeat, upgrade backfill, constraints, RLS and rollback: OK");
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
  const result = spawnSync("corepack", ["pnpm", "migrate"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
