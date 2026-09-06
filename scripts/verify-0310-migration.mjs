import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const sourceUrl = new URL(process.env.DATABASE_URL ?? "");
if (!sourceUrl.pathname.slice(1).endsWith("_test")) throw new Error("DATABASE_URL must name a disposable *_test database");
const database = `lyricscloud_0310_${randomUUID().replaceAll("-", "")}`;
const targetUrl = new URL(sourceUrl); targetUrl.pathname = `/${database}`;
const admin = new Pool({ connectionString: sourceUrl.href, max: 1 });
const rollback = await readFile(resolve("packages/database/rollback/0310_crdt_sync.sql"), "utf8");

try {
  await admin.query(`create database "${database}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: targetUrl.href, max: 1 });
  try {
    const schema = await target.query(`select
      to_regclass('public.sync_documents')::text documents,
      to_regclass('public.sync_updates')::text updates,
      to_regclass('public.sync_update_receipts')::text receipts,
      (select count(*)::integer from schema_migrations where name='0310_crdt_sync.sql') applied,
      (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.sync_documents'::regclass) forced_rls`);
    assert.deepEqual(schema.rows[0], { documents: "sync_documents", updates: "sync_updates", receipts: "sync_update_receipts", applied: 1, forced_rls: true });
    await target.query(await readFile(resolve("packages/database/fixtures/0200_resources_songs.sql"), "utf8"));
    const lyric = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,'02000000-0000-4000-8000-000000000001','lyrics','합성 가사')", [lyric]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,'02000000-0000-4000-8000-000000000001','02000000-0000-4000-8000-000000000101','한글 🎵')", [lyric]);
    await target.query("insert into sync_documents(resource_id,owner_id,snapshot) values($1,'02000000-0000-4000-8000-000000000001',decode('0100','hex'))", [lyric]);
    await target.query("commit");
    const client = await target.connect();
    try {
      await client.query("begin"); await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id','02000000-0000-4000-8000-000000000002',true)");
      assert.equal((await client.query("select * from sync_documents")).rowCount, 0, "other owner must not observe sync mappings");
      await client.query("rollback");
    } finally { client.release(); }
    await target.query(await readFile(resolve("packages/database/rollback/0500_prompts.sql"), "utf8"));
    await target.query(await readFile(resolve("packages/database/rollback/0400_rhyme_notes.sql"), "utf8"));
    await assert.rejects(target.query(rollback), /0310_ROLLBACK_REQUIRES_EMPTY_SYNC_DOCUMENTS/);
    await target.query("delete from resources where id=$1", [lyric]);
    await target.query(await readFile(resolve("packages/database/rollback/0311_lyric_revisions.sql"), "utf8"));
    await target.query(rollback);
    assert.equal((await target.query("select to_regclass('public.sync_documents')::text value")).rows[0].value, null);
    migrate(); migrate();
  } finally { await target.end(); }
  console.log("0310 migration, forced RLS, populated rollback guard, and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${database}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: "test", DATABASE_URL: targetUrl.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration command failed");
}
