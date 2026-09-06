import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const name = `lyricscloud_0311_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${name}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0311_lyric_revisions.sql", "utf8");
try {
  await admin.query(`create database "${name}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 1 });
  try {
    const owner = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID(), lyric = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','합성 곡'),($3,$2,'lyrics','합성 가사')", [song, owner, lyric]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,$2,$3,'보존할 본문')", [lyric, owner, song]);
    const key = (await target.query("insert into sync_documents(resource_id,owner_id,snapshot) values($1,$2,decode('0000','hex')) returning document_key", [lyric, owner])).rows[0].document_key;
    await target.query("commit");
    const revision = (await target.query(`insert into lyric_revisions(document_key,owner_id,body,body_sha256,reason)
      values($1,$2,'과거 표현',encode(sha256(convert_to('과거 표현','UTF8')),'hex'),'leave') returning id`, [key, owner])).rows[0].id;
    const rls = await target.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='lyric_revisions'::regclass");
    assert.deepEqual(rls.rows[0], { relrowsecurity: true, relforcerowsecurity: true });
    await assert.rejects(target.query(rollback), /0311_ROLLBACK_REQUIRES_EMPTY_REVISIONS/);
    assert.equal((await target.query("select body from lyric_revisions where id=$1", [revision])).rows[0].body, "과거 표현");
    // Only synthetic history in this newly created database is removed.
    await target.query("delete from lyric_revisions where id=$1", [revision]);
    await target.query(rollback);
    assert.equal((await target.query("select body from lyrics where resource_id=$1", [lyric])).rows[0].body, "보존할 본문");
    assert.equal((await target.query("select count(*)::int count from sync_documents where document_key=$1", [key])).rows[0].count, 1);
    migrate(); migrate();
    assert.equal((await target.query("select revision_body_sha256=encode(sha256(convert_to('보존할 본문','UTF8')),'hex') ok from sync_documents where document_key=$1", [key])).rows[0].ok, true);
  } finally { await target.end(); }
  console.log("0311 migration, forced RLS, populated rollback guard, current-body preservation and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${name}" with (force)`).catch(() => undefined);
  await admin.end();
}
function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
