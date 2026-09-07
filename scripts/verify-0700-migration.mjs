import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0700_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0700_search_foundation.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 1 });
  try {
    assert.equal((await target.query("select extversion from pg_extension where extname='pg_trgm'")).rowCount, 1);
    assert.equal((await target.query("select search_normalize('  ＦＩＲＥ\n Verse １  ') value")).rows[0].value, "fire verse 1");
    const expectedIndexes = [
      "resources_active_search_title_trgm_idx", "lyrics_search_body_trgm_idx",
      "rhyme_notes_search_body_trgm_idx", "prompts_search_text_trgm_idx",
      "tags_active_search_value_trgm_idx", "prompt_tokens_normalized_trgm_idx"
    ];
    const indexes = (await target.query(
      "select indexname from pg_indexes where schemaname='public' and indexname=any($1::text[])", [expectedIndexes]
    )).rows.map(({ indexname }) => indexname);
    assert.equal(indexes.length, expectedIndexes.length);

    const owner = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','  ＦＩＲＥ  Verse １ ')", [song, owner]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query("commit");
    const projected = (await target.query(
      "select title,search_title from resources where id=$1", [song]
    )).rows[0];
    assert.equal(projected.title, "ＦＩＲＥ  Verse １");
    assert.equal(projected.search_title, "fire verse 1");

    await target.query(rollback);
    assert.equal((await target.query("select title from resources where id=$1", [song])).rows[0].title, "ＦＩＲＥ  Verse １");
    assert.equal((await target.query("select 1 from pg_extension where extname='pg_trgm'")).rowCount, 1);
    await assert.rejects(target.query("select search_title from resources"), /column "search_title" does not exist/);
    migrate(); migrate();
    assert.equal((await target.query("select search_title from resources where id=$1", [song])).rows[0].search_title, "fire verse 1");
  } finally { await target.end(); }
  console.log("0700 search normalization, pg_trgm indexes, authored-text preservation and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
