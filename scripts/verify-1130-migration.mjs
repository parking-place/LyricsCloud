import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1130_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1130_public_lyric_guest_write.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 3 });
  try {
    const owner = await user(target, "owner"); const stranger = await user(target, "stranger");
    const song = randomUUID(); const lyric = randomUUID(); const otherLyric = randomUUID();
    const documentKey = randomUUID(); const otherDocumentKey = randomUUID(); const linkId = randomUUID();
    const linkDigest = "1".repeat(64); const sessionDigest = "2".repeat(64);
    const replacementSessionDigest = "3".repeat(64);
    await target.query("begin");
    await target.query(`insert into resources(id,owner_id,type,title) values
      ($1,$2,'song','parent'),($3,$2,'lyrics','shared'),($4,$2,'lyrics','other')`, [song, owner, lyric, otherLyric]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query(`insert into lyrics(resource_id,owner_id,song_id,body) values
      ($1,$2,$3,'preserved body'),($4,$2,$3,'other body')`, [lyric, owner, song, otherLyric]);
    await target.query(`insert into sync_documents(document_key,resource_id,owner_id,resource_type,snapshot)
      values($1,$2,$3,'lyrics',$4),($5,$6,$3,'lyrics',$4)`,
    [documentKey, lyric, owner, Buffer.from([0]), otherDocumentKey, otherLyric]);
    await target.query(`insert into lyric_public_read_links(id,resource_id,owner_id,token_digest,permission_epoch,expires_at)
      values($1,$2,$3,$4,3,statement_timestamp()+interval '1 day')`, [linkId, lyric, owner, linkDigest]);
    await target.query("commit");

    assert.equal((await target.query("select * from app_issue_public_guest_session($1,$2)", [linkDigest, sessionDigest])).rowCount, 0,
      "read-only links must not mint writer sessions");
    assert.equal((await asUser(target, stranger, (client) => client.query(
      "update lyric_public_read_links set write_enabled=true where id=$1", [linkId]))).rowCount, 0);
    await asUser(target, owner, (client) => client.query(`update lyric_public_read_links
      set write_enabled=true,write_epoch=write_epoch+1,write_confirmed_at=clock_timestamp() where id=$1`, [linkId]));
    const session = (await target.query("select * from app_issue_public_guest_session($1,$2)", [linkDigest, sessionDigest])).rows[0];
    assert.equal(session.link_id, linkId); assert.equal(session.resource_id, lyric);
    assert.equal(session.write_epoch, "2");
    assert.match(session.display_name, /^게스트-[0-9A-F]{4}$/);
    assert.equal((await target.query("select * from app_public_guest_session_access($1,$2,$3)",
      [linkDigest, linkId, sessionDigest])).rowCount, 1);
    assert.equal((await target.query("select * from app_authorize_public_lyric_write($1,$2,$3,$4,3,2,10)",
      [otherDocumentKey, linkId, linkDigest, sessionDigest])).rowCount, 0,
    "a valid capability must not cross resources");

    for (let index = 0; index < 4; index++) {
      const allowed = (await target.query("select * from app_authorize_public_lyric_write($1,$2,$3,$4,3,2,1048576)",
        [documentKey, linkId, linkDigest, sessionDigest])).rows[0];
      assert.equal(allowed.allowed, true); assert.equal(allowed.rate_limited, false);
    }
    const limited = (await target.query("select * from app_authorize_public_lyric_write($1,$2,$3,$4,3,2,1)",
      [documentKey, linkId, linkDigest, sessionDigest])).rows[0];
    assert.equal(limited.allowed, false); assert.equal(limited.rate_limited, true);

    const updateId = randomUUID();
    await target.query(`insert into sync_update_receipts
      (document_key,update_id,payload_sha256,accepted_sequence,access_mode,permission_epoch,write_epoch,public_guest_session_id)
      values($1,$2,$3,9,'public-write',3,2,$4)`, [documentKey, updateId, "a".repeat(64), session.session_id]);
    const currentReceipt = (await target.query(
      "select payload_sha256,accepted_sequence::text from app_public_lyric_write_receipt($1,$2,$3,$4,$5,3,2)",
      [documentKey, updateId, linkId, linkDigest, sessionDigest])).rows[0];
    assert.deepEqual(currentReceipt, { payload_sha256: "a".repeat(64), accepted_sequence: "9" });
    await target.query("update lyric_public_read_links set write_enabled=false,write_epoch=write_epoch+1 where id=$1", [linkId]);
    assert.equal((await target.query(
      "select * from app_public_lyric_write_receipt($1,$2,$3,$4,$5,3,2)",
      [documentKey, updateId, linkId, linkDigest, sessionDigest])).rowCount, 0,
    "a historical receipt must not bypass the current write kill switch");
    await target.query("update lyric_public_read_links set write_enabled=true,write_epoch=write_epoch+1 where id=$1", [linkId]);
    assert.equal((await target.query("select * from app_public_guest_session_access($1,$2,$3)",
      [linkDigest, linkId, sessionDigest])).rowCount, 0,
    "write re-enable must not resurrect a session from an older write epoch");
    const replacement = (await target.query("select * from app_issue_public_guest_session($1,$2)",
      [linkDigest, replacementSessionDigest])).rows[0];
    assert.equal(replacement.write_epoch, "4");
    await target.query("update lyric_public_read_links set write_enabled=false,write_epoch=write_epoch+1 where id=$1", [linkId]);

    await assert.rejects(target.query(rollback), /1130 rollback blocked: public guest updates exist/);
    await target.query("delete from sync_update_receipts where update_id=$1", [updateId]);
    await target.query(rollback);
    assert.equal((await target.query(`select 1 from information_schema.columns
      where table_name='lyric_public_read_links' and column_name='write_enabled'`)).rowCount, 0);
    assert.equal((await target.query("select body from lyrics where resource_id=$1", [lyric])).rows[0].body, "preserved body");
    migrate(); migrate();
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1130_public_lyric_guest_write.sql'")).rows[0].count, 1);
  } finally { await target.end(); }
  console.log("1130 public guest write fresh/repeat, W subset R, durable budget, attribution, RLS, rollback and recovery: OK");
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
