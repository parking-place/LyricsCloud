import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0801_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0801_display_settings.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID(); const lyric = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','parent'),($3,$2,'lyrics','child')", [song, alice, lyric]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, alice]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id) values($1,$2,$3)", [lyric, alice, song]);
    await target.query("commit");
    await asUser(target, alice, (client) => client.query("insert into user_settings(owner_id,theme) values($1,'dark')", [alice]));
    assert.equal((await asUser(target, bob, (client) => client.query("select * from user_settings where owner_id=$1", [alice]))).rowCount, 0);
    await assert.rejects(asUser(target, bob, (client) => client.query("insert into user_settings(owner_id) values($1)", [alice])), /row-level security/);
    await asUser(target, alice, (client) => client.query("insert into lyric_display_settings(lyric_id,owner_id,writing_font,font_size,line_height,letter_spacing) values($1,$2,'mono',16,2,-0.01)", [lyric, alice]));
    assert.equal((await asUser(target, bob, (client) => client.query("select * from lyric_display_settings where lyric_id=$1", [lyric]))).rowCount, 0);
    await assert.rejects(asUser(target, alice, (client) => client.query("update user_settings set font_size=99 where owner_id=$1", [alice])), /check constraint/);
    await target.query(rollback);
    assert.equal((await target.query("select to_regclass('public.user_settings')::text value")).rows[0].value, null);
    migrate(); migrate();
    assert.equal((await target.query("select exists(select 1 from schema_migrations where name='0801_display_settings.sql') applied")).rows[0].applied, true);
  } finally { await target.end(); }
  console.log("0801 account defaults, lyric override ownership, constraints, rollback and recovery: OK");
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
