import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1140_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1140_sharing_stability.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const owner = await user(target, "owner"); const writer = await user(target, "writer");
    const song = randomUUID(); const lyric = randomUUID(); const grant = randomUUID(); const link = randomUUID();
    await target.query("begin");
    await target.query(`insert into resources(id,owner_id,type,title) values
      ($1,$2,'song','parent'),($3,$2,'lyrics','shared')`, [song, owner, lyric]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,$2,$3,'preserved')", [lyric, owner, song]);
    await target.query(`insert into lyric_read_grants
      (id,resource_id,owner_id,grantee_id,permission_epoch,write_enabled,write_epoch)
      values($1,$2,$3,$4,5,true,8)`, [grant, lyric, owner, writer]);
    await target.query(`insert into lyric_public_read_links
      (id,resource_id,owner_id,token_digest,permission_epoch,write_enabled,write_epoch,expires_at)
      values($1,$2,$3,$4,6,true,9,statement_timestamp()+interval '1 day')`, [link, lyric, owner, "8".repeat(64)]);
    await target.query("commit");

    await asUser(target, owner, (client) => client.query(
      "update resources set deleted_at=clock_timestamp(),deletion_batch_id=$2 where id=$1", [lyric, randomUUID()]));
    assert.deepEqual((await target.query(`select state,permission_epoch::int,write_enabled,write_epoch::int
      from lyric_read_grants where id=$1`, [grant])).rows[0],
    { state: "revoked", permission_epoch: 6, write_enabled: false, write_epoch: 9 });
    assert.deepEqual((await target.query(`select state,permission_epoch::int,write_enabled,write_epoch::int
      from lyric_public_read_links where id=$1`, [link])).rows[0],
    { state: "revoked", permission_epoch: 7, write_enabled: false, write_epoch: 10 });
    await asUser(target, owner, (client) => client.query(
      "update resources set deleted_at=null,deletion_batch_id=null where id=$1", [lyric]));
    assert.equal((await target.query("select count(*)::int count from lyric_read_grants where id=$1 and state='active'", [grant])).rows[0].count, 0);
    assert.equal((await target.query("select count(*)::int count from lyric_public_read_links where id=$1 and state='active'", [link])).rows[0].count, 0);
    assert.equal((await target.query("select body from lyrics where resource_id=$1", [lyric])).rows[0].body, "preserved");

    await target.query(rollback);
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1140_sharing_stability.sql'")).rows[0].count, 0);
    assert.equal((await target.query("select count(*)::int count from pg_trigger where tgname='resources_revoke_lyric_capabilities_on_delete' and not tgisinternal")).rows[0].count, 0);
    migrate(); migrate();
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1140_sharing_stability.sql'")).rows[0].count, 1);
  } finally { await target.end(); }
  console.log("1140 sharing delete fence fresh/repeat, epoch revoke, non-resurrection, rollback and recovery: OK");
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
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href, APP_VERSION: "1.1.4" }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
