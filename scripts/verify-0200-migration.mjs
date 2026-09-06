import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const sourceUrl = new URL(process.env.DATABASE_URL ?? "");
const sourceDatabase = sourceUrl.pathname.slice(1);
if (!sourceDatabase.endsWith("_test")) throw new Error("DATABASE_URL must name a disposable *_test database");

const temporaryDatabase = `lyricscloud_phase1_${randomUUID().replaceAll("-", "")}`;
const temporaryUrl = new URL(sourceUrl);
temporaryUrl.pathname = `/${temporaryDatabase}`;
const admin = new Pool({ connectionString: sourceUrl.href, max: 1 });

try {
  await admin.query(`create database "${temporaryDatabase}"`);
  migrate(temporaryUrl.href);
  migrate(temporaryUrl.href);

  const target = new Pool({ connectionString: temporaryUrl.href, max: 1 });
  try {
    const fixture = await readFile(resolve("packages/database/fixtures/0200_resources_songs.sql"), "utf8");
    await target.query(fixture);
    const counts = await target.query(`
      select (select count(*) from resources)::text as resources,
             (select count(*) from songs)::text as songs
    `);
    if (counts.rows[0]?.resources !== "3" || counts.rows[0]?.songs !== "3") {
      throw new Error("representative fixture did not create three complete song pairs");
    }

    await target.query(await readFile(resolve("packages/database/rollback/0400_rhyme_notes.sql"), "utf8"));
    await target.query(await readFile(resolve("packages/database/rollback/0311_lyric_revisions.sql"), "utf8"));
    const syncRollback = await readFile(resolve("packages/database/rollback/0310_crdt_sync.sql"), "utf8");
    await target.query(syncRollback);
    const lyricRollback = await readFile(resolve("packages/database/rollback/0300_lyrics.sql"), "utf8");
    await target.query(lyricRollback);
    const dependentRollback = await readFile(resolve("packages/database/rollback/0201_song_commands.sql"), "utf8");
    await target.query(dependentRollback);
    const rollback = await readFile(resolve("packages/database/rollback/0200_resources_songs.sql"), "utf8");
    await target.query(rollback);
    const rolledBack = await target.query(`
      select to_regclass('public.resources')::text as resources,
             to_regclass('public.songs')::text as songs,
             exists(select 1 from schema_migrations where name in ('0200_resources_songs.sql', '0201_song_commands.sql')) as migration
    `);
    if (rolledBack.rows[0]?.resources !== null || rolledBack.rows[0]?.songs !== null || rolledBack.rows[0]?.migration) {
      throw new Error("0200 rollback left schema objects or migration history behind");
    }
  } finally {
    await target.end();
  }

  migrate(temporaryUrl.href);
  const recovered = new Pool({ connectionString: temporaryUrl.href, max: 1 });
  try {
    const result = await recovered.query(`
      select to_regclass('public.resources')::text as resources,
             to_regclass('public.songs')::text as songs,
             exists(select 1 from schema_migrations where name = '0200_resources_songs.sql') as applied,
             to_regclass('public.song_create_requests')::text as requests
    `);
    if (result.rows[0]?.resources !== "resources" || result.rows[0]?.songs !== "songs"
      || result.rows[0]?.requests !== "song_create_requests" || !result.rows[0]?.applied) {
      throw new Error("0200 migration could not recover after rollback");
    }
  } finally {
    await recovered.end();
  }

  console.log("0200 migration, fixture, rollback, and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${temporaryDatabase}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate(databaseUrl) {
  const result = spawnSync("pnpm", ["migrate"], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: databaseUrl },
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration command failed");
}
