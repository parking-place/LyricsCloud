import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const sourceUrl = new URL(process.env.DATABASE_URL ?? "");
if (!sourceUrl.pathname.slice(1).endsWith("_test")) {
  throw new Error("DATABASE_URL must name a disposable *_test database");
}
const temporaryDatabase = `lyricscloud_0300_${randomUUID().replaceAll("-", "")}`;
const temporaryUrl = new URL(sourceUrl);
temporaryUrl.pathname = `/${temporaryDatabase}`;
const admin = new Pool({ connectionString: sourceUrl.href, max: 1 });
const rollback = await readFile(resolve("packages/database/rollback/0300_lyrics.sql"), "utf8");

try {
  await admin.query(`create database "${temporaryDatabase}"`);
  migrate();
  migrate();
  const target = new Pool({ connectionString: temporaryUrl.href, max: 1 });
  try {
    await assertApplied(target);
    await target.query(await readFile(resolve("packages/database/fixtures/0200_resources_songs.sql"), "utf8"));
    const before = await songState(target);
    assert.equal(before.length, 3, "the disposable fixture must contain three complete song pairs");

    // The rollback must refuse to discard even one synthetic lyric. A separate
    // disposable database ensures that checking this guard cannot affect users.
    const lyricId = randomUUID();
    const ownerId = "02000000-0000-4000-8000-000000000001";
    const songId = "02000000-0000-4000-8000-000000000101";
    const client = await target.connect();
    try {
      await client.query("begin");
      await client.query("insert into resources(id, owner_id, type, title) values ($1, $2, 'lyrics', $3)",
        [lyricId, ownerId, "합성 rollback 보호 가사"]);
      await client.query("insert into lyrics(resource_id, owner_id, song_id, body) values ($1, $2, $3, $4)",
        [lyricId, ownerId, songId, "[Verse]\n합성 원문 🎵"]);
      await client.query("commit");
      await assert.rejects(client.query(rollback), /0300_ROLLBACK_REQUIRES_EMPTY_LYRICS_AND_BATCHES/);
      await client.query("rollback");
      const preserved = await client.query("select body from lyrics where resource_id = $1", [lyricId]);
      assert.equal(preserved.rows[0]?.body, "[Verse]\n합성 원문 🎵", "refused rollback must preserve the lyric");
      await client.query("delete from resources where id = $1", [lyricId]);
    } finally {
      await client.query("rollback").catch(() => undefined);
      client.release();
    }

    await target.query(await readFile(resolve("packages/database/rollback/0400_rhyme_notes.sql"), "utf8"));
    await target.query(await readFile(resolve("packages/database/rollback/0311_lyric_revisions.sql"), "utf8"));
    await target.query(await readFile(resolve("packages/database/rollback/0310_crdt_sync.sql"), "utf8"));
    await target.query(rollback);
    const rolledBack = await target.query(`select
      to_regclass('public.lyrics')::text as lyrics,
      to_regclass('public.lyric_create_requests')::text as requests,
      to_regclass('public.song_create_requests')::text as song_requests,
      exists(select 1 from schema_migrations where name = '0300_lyrics.sql') as applied,
      exists(select 1 from information_schema.columns where table_schema = 'public'
        and table_name = 'resources' and column_name = 'deletion_batch_id') as batches`);
    assert.deepEqual(rolledBack.rows[0], { lyrics: null, requests: null, song_requests: "song_create_requests", applied: false, batches: false });
    assert.deepEqual(await songState(target), before, "0300 rollback must preserve existing songs and metadata");

    migrate();
    migrate();
    await assertApplied(target);
    assert.deepEqual(await songState(target), before, "0300 reapplication must preserve existing songs and metadata");
  } finally {
    await target.end();
  }
  console.log("0300 migration, populated rollback guard, existing-song preservation, and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${temporaryDatabase}" with (force)`).catch(() => undefined);
  await admin.end();
}

async function assertApplied(pool) {
  const result = await pool.query(`select
    to_regclass('public.lyrics')::text as lyrics,
    to_regclass('public.lyric_create_requests')::text as requests,
    (select count(*)::integer from schema_migrations where name = '0300_lyrics.sql') as applied,
    (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.lyrics'::regclass) as forced_rls,
    exists(select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'resources' and column_name = 'deletion_batch_id') as batches`);
  assert.deepEqual(result.rows[0], { lyrics: "lyrics", requests: "lyric_create_requests", applied: 1, forced_rls: true, batches: true });
}

async function songState(pool) {
  const result = await pool.query(`select r.id, r.owner_id, r.title, r.is_favorite, r.is_pinned, r.pin_order,
    r.color, r.row_version::text, r.created_at::text, r.updated_at::text, r.deleted_at::text,
    s.status, s.description, s.work_notes from resources r join songs s on s.resource_id = r.id
    where r.type = 'song' order by r.id`);
  return result.rows;
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: "test", DATABASE_URL: temporaryUrl.href }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration command failed");
}
