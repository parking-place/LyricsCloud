import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1003_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1003_song_suno_workspaces.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  target.on("error", (error) => {
    if (error && typeof error === "object" && "code" in error && error.code === "57P01") return;
    process.exitCode = 1; console.error(error);
  });
  try {
    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title,is_pinned) values($1,$2,'song','Suno migration',false)", [song, alice]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, alice]);
    await target.query("commit");
    await target.query("insert into song_suno_workspaces(song_resource_id,owner_id,model_label) values($1,$2,'custom-v6')", [song, alice]);
    await target.query(`insert into song_suno_links(owner_id,song_resource_id,url,title,note,position)
      values($1,$2,'https://suno.com/song/11111111-1111-4111-8111-111111111111','one','memo',0)`, [alice, song]);

    for (const table of ["song_suno_workspaces", "song_suno_links", "song_suno_command_requests"]) {
      const policy = await target.query("select relrowsecurity,relforcerowsecurity from pg_class where oid=$1::regclass", [table]);
      assert.deepEqual(policy.rows[0], { relrowsecurity: true, relforcerowsecurity: true });
    }
    assert.equal((await asUser(target, alice, (client) => client.query("select 1 from song_suno_links"))).rowCount, 1);
    assert.equal((await asUser(target, bob, (client) => client.query("select 1 from song_suno_links"))).rowCount, 0);
    await assert.rejects(asUser(target, bob, (client) => client.query(
      "insert into song_suno_workspaces(song_resource_id,owner_id) values($1,$2)", [song, alice])), /row-level security/);
    await assert.rejects(target.query(`insert into song_suno_links(owner_id,song_resource_id,url,position)
      values($1,$2,'https://suno.com/s/abcdef',20)`, [alice, song]), /check constraint/);

    await target.query("delete from schema_migrations where name='1003_song_suno_workspaces.sql'");
    await target.query(rollback);
    migrate(); migrate();
    assert.equal((await target.query("select count(*)::int count from song_suno_workspaces")).rows[0].count, 0);
  } finally { await target.end(); }
  console.log("1003 Suno workspace fresh/repeat, upgrade, constraints, RLS and rollback: OK");
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
