import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1110_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1110_public_lyric_read_links.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const owner = await user(target, "owner@example.invalid"); const stranger = await user(target, "stranger");
    const song = randomUUID(); const lyric = randomUUID(); const document = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','private song'),($3,$2,'lyrics','public title')", [song, owner, lyric]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body,memo,status) values($1,$2,$3,'public body','private memo','draft')", [lyric, owner, song]);
    await target.query("insert into sync_documents(document_key,resource_id,owner_id,snapshot) values($1,$2,$3,$4)", [document, lyric, owner, Buffer.from([0])]);
    await target.query("commit");
    const digest = "1".repeat(64); const link = randomUUID();
    await asUser(target, owner, (client) => client.query(`insert into lyric_public_read_links
      (id,resource_id,owner_id,token_digest,permission_epoch,show_owner_display_name,expires_at)
      values($1,$2,$3,$4,1,true,statement_timestamp()+interval '7 days')`, [link, lyric, owner, digest]));
    const projection = (await asPublic(target, (client) => client.query("select * from app_public_lyric_projection($1)", [digest]))).rows[0];
    assert.equal(projection.title, "public title"); assert.equal(projection.body, "public body");
    assert.equal(projection.owner_display_name, "공유자"); assert.equal(projection.status, null);
    assert.equal(JSON.stringify(projection).includes("private memo"), false);
    assert.equal((await asUser(target, stranger, (client) => client.query("select * from lyric_public_read_links"))).rowCount, 0);
    assert.equal((await asUser(target, stranger, (client) => client.query("update lyrics set body='bad' where resource_id=$1", [lyric]))).rowCount, 0);
    await asUser(target, owner, (client) => client.query(`update lyric_public_read_links
      set state='revoked',permission_epoch=permission_epoch+1,revoked_at=clock_timestamp() where id=$1`, [link]));
    assert.equal((await asPublic(target, (client) => client.query("select * from app_public_lyric_projection($1)", [digest]))).rowCount, 0);
    await target.query(rollback);
    assert.equal((await target.query("select to_regclass('public.lyric_public_read_links') present")).rows[0].present, null);
    assert.equal((await target.query("select body from lyrics where resource_id=$1", [lyric])).rows[0].body, "public body");
    migrate(); migrate();
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1110_public_lyric_read_links.sql'")).rows[0].count, 1);
  } finally { await target.end(); }
  console.log("1110 public-link fresh/repeat, minimal projection, RLS, revoke, rollback and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined); await admin.end();
}

async function user(pool, displayName) {
  const id = (await pool.query("insert into app_users default values returning id")).rows[0].id;
  await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, displayName]); return id;
}
async function asUser(pool, actorId, work) {
  return transaction(pool, async (client) => { await client.query("select set_config('app.user_id',$1,true)", [actorId]); return work(client); });
}
async function asPublic(pool, work) { return transaction(pool, work); }
async function transaction(pool, work) {
  const client = await pool.connect();
  try { await client.query("begin"); await client.query("set local role lyricscloud_app"); const result=await work(client); await client.query("commit"); return result; }
  catch(error){ await client.query("rollback").catch(()=>undefined); throw error; } finally { client.release(); }
}
function migrate() {
  const result = spawnSync("corepack", ["pnpm", "migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
