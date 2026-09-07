import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const suffix = randomUUID().replaceAll("-", "");
const freshName = `lyricscloud_0700_release_fresh_${suffix}`;
const upgradeName = `lyricscloud_0700_release_upgrade_${suffix}`;
const freshUrl = databaseUrl(freshName);
const upgradeUrl = databaseUrl(upgradeName);
const admin = new Pool({ connectionString: source.href, max: 1 });

try {
  await admin.query(`create database "${freshName}"`);
  await admin.query(`create database "${upgradeName}"`);

  migrate(freshUrl);
  migrate(freshUrl);
  await assertNavigationSchema(freshUrl);

  await applyPreviousVersionMigrations(upgradeUrl);
  const fixture = await seedPreviousVersion(upgradeUrl);
  migrate(upgradeUrl);
  migrate(upgradeUrl);
  await assertNavigationSchema(upgradeUrl);
  await assertUpgradePreservedData(upgradeUrl, fixture);

  console.log(JSON.stringify({
    freshDatabase: "PASS",
    previousVersionDatabase: "0.6.0 through 0501_prompt_usage.sql -> 0.7.0 PASS",
    currentSchema: "0702_recent_items.sql",
    preserved: ["authored title and lyric body", "favorite and pin metadata", "owner identity"],
    searchIndexes: 6
  }));
} finally {
  await admin.query(`drop database if exists "${freshName}" with (force)`).catch(() => undefined);
  await admin.query(`drop database if exists "${upgradeName}" with (force)`).catch(() => undefined);
  await admin.end();
}

function databaseUrl(name) {
  const value = new URL(source); value.pathname = `/${name}`; return value.href;
}

function migrate(url) {
  const result = spawnSync("pnpm", ["migrate"], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}

async function applyPreviousVersionMigrations(url) {
  const target = new Pool({ connectionString: url, max: 1 });
  try {
    await target.query(`create table schema_migrations (
      name text primary key, sha256 text not null, applied_at timestamptz not null default now()
    )`);
    const directory = resolve("packages/database/migrations");
    const names = (await readdir(directory)).filter((name) => name.endsWith(".sql") && name <= "0501_prompt_usage.sql").sort();
    for (const name of names) {
      const sql = await readFile(resolve(directory, name), "utf8");
      const sha256 = createHash("sha256").update(sql).digest("hex");
      await target.query("begin");
      try {
        await target.query(sql);
        await target.query("insert into schema_migrations(name,sha256) values($1,$2)", [name, sha256]);
        await target.query("commit");
      } catch (error) {
        await target.query("rollback");
        throw error;
      }
    }
    assert.equal(names.at(-1), "0501_prompt_usage.sql");
  } finally { await target.end(); }
}

async function seedPreviousVersion(url) {
  const target = new Pool({ connectionString: url, max: 1 });
  try {
    const ownerId = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const songId = randomUUID();
    const lyricId = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title,is_favorite,is_pinned,pin_order) values($1,$2,'song','  ＦＩＲＥ  이전 곡 ',true,true,0)", [songId, ownerId]);
    await target.query("insert into songs(resource_id,owner_id,status) values($1,$2,'writing_lyrics')", [songId, ownerId]);
    await target.query("insert into resources(id,owner_id,type,title,is_favorite) values($1,$2,'lyrics','이전 가사',true)", [lyricId, ownerId]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body,status) values($1,$2,$3,'[Hook]\n원문 보존 needle0700','revising')", [lyricId, ownerId, songId]);
    await target.query("commit");
    return { ownerId, songId, lyricId };
  } finally { await target.end(); }
}

async function assertNavigationSchema(url) {
  const target = new Pool({ connectionString: url, max: 1 });
  try {
    const migrations = (await target.query(`select name from schema_migrations
      where name in ('0700_search_foundation.sql','0701_recent_searches.sql','0702_recent_items.sql') order by name`)).rows.map(({ name }) => name);
    assert.deepEqual(migrations, ["0700_search_foundation.sql", "0701_recent_searches.sql", "0702_recent_items.sql"]);
    const expectedIndexes = [
      "resources_active_search_title_trgm_idx", "lyrics_search_body_trgm_idx", "rhyme_notes_search_body_trgm_idx",
      "prompts_search_text_trgm_idx", "tags_active_search_value_trgm_idx", "prompt_tokens_normalized_trgm_idx"
    ];
    const actual = (await target.query("select indexname from pg_indexes where schemaname='public' and indexname=any($1::text[])", [expectedIndexes])).rows;
    assert.equal(actual.length, expectedIndexes.length);
    assert.equal((await target.query("select to_regclass('public.recent_searches')::text value")).rows[0].value, "recent_searches");
    assert.equal((await target.query("select to_regclass('public.recent_items')::text value")).rows[0].value, "recent_items");
  } finally { await target.end(); }
}

async function assertUpgradePreservedData(url, fixture) {
  const target = new Pool({ connectionString: url, max: 1 });
  try {
    const song = (await target.query("select owner_id,title,search_title,is_favorite,is_pinned,pin_order from resources where id=$1", [fixture.songId])).rows[0];
    assert.deepEqual(song, { owner_id: fixture.ownerId, title: "ＦＩＲＥ  이전 곡", search_title: "fire 이전 곡", is_favorite: true, is_pinned: true, pin_order: 0 });
    const lyric = (await target.query(`select r.title,r.is_favorite,l.body,l.search_body from resources r join lyrics l on l.resource_id=r.id
      where r.id=$1 and r.owner_id=$2`, [fixture.lyricId, fixture.ownerId])).rows[0];
    assert.deepEqual(lyric, { title: "이전 가사", is_favorite: true, body: "[Hook]\n원문 보존 needle0700", search_body: "[hook] 원문 보존 needle0700" });
  } finally { await target.end(); }
}
