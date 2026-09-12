import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1120_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1120_selected_lyric_write.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const owner = await user(target, "owner");
    const writer = await user(target, "writer");
    const stranger = await user(target, "stranger");
    const song = randomUUID(); const lyric = randomUUID(); const documentKey = randomUUID(); const grantId = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','song'),($3,$2,'lyrics','lyric')", [song, owner, lyric]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body,status) values($1,$2,$3,'body','draft')", [lyric, owner, song]);
    await target.query("insert into sync_documents(document_key,resource_id,owner_id,snapshot) values($1,$2,$3,$4)", [documentKey, lyric, owner, Buffer.from([0])]);
    await target.query(`insert into lyric_read_grants(id,resource_id,owner_id,grantee_id,permission_epoch,write_enabled,write_epoch)
      values($1,$2,$3,$4,3,false,5)`, [grantId, lyric, owner, writer]);
    await target.query("commit");

    assert.equal((await authorize(target, writer, documentKey, grantId, 3, 5)).rowCount, 0);
    await target.query("update lyric_read_grants set write_enabled=true,write_epoch=6 where id=$1", [grantId]);
    assert.deepEqual((await authorize(target, writer, documentKey, grantId, 3, 6)).rows[0], {
      authorized_owner_id: owner, authorized_resource_id: lyric
    });
    assert.equal((await authorize(target, stranger, documentKey, grantId, 3, 6)).rowCount, 0);
    assert.equal((await authorize(target, writer, documentKey, grantId, 3, 5)).rowCount, 0);

    const updateId = randomUUID();
    await target.query(`insert into sync_update_receipts
      (document_key,update_id,payload_sha256,accepted_sequence,actor_id,access_mode,grant_id,permission_epoch,write_epoch)
      values($1,$2,$3,9,$4,'write',$5,3,6)`, [documentKey, updateId, "a".repeat(64), writer, grantId]);
    await target.query("update lyric_read_grants set write_enabled=false,write_epoch=7 where id=$1", [grantId]);
    const receipt = await asUser(target, writer, (client) => client.query(
      "select payload_sha256,accepted_sequence::text from app_selected_lyric_write_receipt($1,$2,$3,3,6)",
      [documentKey, updateId, grantId]));
    assert.deepEqual(receipt.rows[0], { payload_sha256: "a".repeat(64), accepted_sequence: "9" });
    assert.equal((await asUser(target, stranger, (client) => client.query(
      "select * from app_selected_lyric_write_receipt($1,$2,$3,3,6)", [documentKey, updateId, grantId]))).rowCount, 0);

    await target.query(rollback);
    assert.equal((await target.query("select column_name from information_schema.columns where table_name='lyric_read_grants' and column_name='write_enabled'")).rowCount, 0);
    assert.equal((await target.query("select body from lyrics where resource_id=$1", [lyric])).rows[0].body, "body");
    migrate(); migrate();
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1120_selected_lyric_write.sql'")).rows[0].count, 1);
  } finally { await target.end(); }
  console.log("1120 selected-write fresh/repeat, W subset R, epoch revoke, receipt, RLS, rollback and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

async function user(pool, displayName) {
  const id = (await pool.query("insert into app_users default values returning id")).rows[0].id;
  await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, displayName]);
  return id;
}
async function authorize(pool, actorId, documentKey, grantId, permissionEpoch, writeEpoch) {
  return asUser(pool, actorId, (client) => client.query(
    "select * from app_authorize_selected_lyric_write($1,$2,$3,$4)",
    [documentKey, grantId, permissionEpoch, writeEpoch]));
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
