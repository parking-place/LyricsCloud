import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

const sourceUrl = new URL(process.env.DATABASE_URL ?? "");
const sourceDatabase = sourceUrl.pathname.slice(1);
if (!sourceDatabase.endsWith("_test")) throw new Error("DATABASE_URL must name a disposable *_test database");

const temporaryDatabase = `lyricscloud_phase2_${randomUUID().replaceAll("-", "")}`;
const temporaryUrl = new URL(sourceUrl);
temporaryUrl.pathname = `/${temporaryDatabase}`;
const admin = new Pool({ connectionString: sourceUrl.href, max: 1 });

try {
  await admin.query(`create database "${temporaryDatabase}"`);
  migrate(temporaryUrl.href);
  migrate(temporaryUrl.href);
  const target = new Pool({ connectionString: temporaryUrl.href, max: 1 });
  try {
    const initial = await target.query(`
      select to_regclass('public.song_create_requests')::text as requests,
             exists(select 1 from schema_migrations where name = '0201_song_commands.sql') as applied
    `);
    if (initial.rows[0]?.requests !== "song_create_requests" || !initial.rows[0]?.applied) {
      throw new Error("0201 migration did not create its idempotency contract");
    }

    const rollback = await readFile(resolve("packages/database/rollback/0201_song_commands.sql"), "utf8");
    await target.query(rollback);
    const rolledBack = await target.query(`
      select to_regclass('public.song_create_requests')::text as requests,
             to_regclass('public.resources')::text as resources,
             exists(select 1 from schema_migrations where name = '0201_song_commands.sql') as applied
    `);
    if (rolledBack.rows[0]?.requests !== null || rolledBack.rows[0]?.resources !== "resources" || rolledBack.rows[0]?.applied) {
      throw new Error("0201 rollback damaged its Phase 1 dependency or left history behind");
    }
  } finally { await target.end(); }

  migrate(temporaryUrl.href);
  const recovered = new Pool({ connectionString: temporaryUrl.href, max: 1 });
  try {
    const result = await recovered.query(`
      select to_regclass('public.song_create_requests')::text as requests,
             exists(select 1 from schema_migrations where name = '0201_song_commands.sql') as applied
    `);
    if (result.rows[0]?.requests !== "song_create_requests" || !result.rows[0]?.applied) {
      throw new Error("0201 migration could not recover after rollback");
    }
  } finally { await recovered.end(); }

  console.log("0201 migration, rollback, and recovery: OK");
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
