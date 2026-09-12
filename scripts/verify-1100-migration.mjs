import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1100_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1100_selected_lyric_sharing.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const owner = await user(target, "owner"); const reader = await user(target, "reader");
    const stranger = await user(target, "stranger"); const song = randomUUID(); const lyric = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','parent'),($3,$2,'lyrics','shared')", [song, owner, lyric]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body,memo) values($1,$2,$3,'body','secret')", [lyric, owner, song]);
    await target.query("commit");
    const readerCode = (await target.query("select sharing_id from user_profiles where owner_id=$1", [reader])).rows[0].sharing_id;
    const grantee = (await asUser(target, owner, (client) => client.query("select app_resolve_active_sharing_id($1) id", [readerCode]))).rows[0].id;
    assert.equal(grantee, reader);
    const grant = randomUUID();
    await asUser(target, owner, (client) => client.query(
      "insert into lyric_read_grants(id,resource_id,owner_id,grantee_id) values($1,$2,$3,$4)", [grant, lyric, owner, reader]));
    assert.equal((await asUser(target, reader, (client) => client.query("select body from lyrics where resource_id=$1", [lyric]))).rows[0].body, "body");
    assert.equal((await asUser(target, stranger, (client) => client.query("select body from lyrics where resource_id=$1", [lyric]))).rowCount, 0);
    assert.equal((await asUser(target, reader, (client) => client.query("update lyrics set body='bad' where resource_id=$1", [lyric]))).rowCount, 0);
    await asUser(target, owner, (client) => client.query("update lyric_read_grants set state='revoked',permission_epoch=permission_epoch+1,revoked_at=now() where id=$1", [grant]));
    assert.equal((await asUser(target, reader, (client) => client.query("select body from lyrics where resource_id=$1", [lyric]))).rowCount, 0);

    await target.query(rollback);
    assert.equal((await target.query("select exists(select 1 from information_schema.columns where table_name='user_profiles' and column_name='sharing_id') present")).rows[0].present, false);
    assert.equal((await target.query("select to_regclass('public.lyric_read_grants') present")).rows[0].present, null);
    migrate(); migrate();
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1100_selected_lyric_sharing.sql'")).rows[0].count, 1);
  } finally { await target.end(); }
  console.log("1100 selected sharing fresh/repeat, RLS, revoke, rollback and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

async function user(pool, displayName) {
  const id = (await pool.query("insert into app_users default values returning id")).rows[0].id;
  await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, displayName]);
  return id;
}

async function asUser(pool, actorId, work) {
  const client = await pool.connect();
  try {
    await client.query("begin"); await client.query("set local role lyricscloud_app");
    await client.query("select set_config('app.user_id',$1,true)", [actorId]);
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
